define([
    'io',
    'underscore'
], function(
    io,
    _
) {
'use strict';

return ['wdEventEmitter', '$rootScope', 'wdDev', '$log', 'GA', 'wdGoogleSignIn', 'wdAuthToken',
function(wdEventEmitter,   $rootScope,   wdDev,   $log,   GA,   wdGoogleSignIn,   wdAuthToken) {

function Socket() {
    // Mixin event emitter behavior.
    wdEventEmitter(this);
    this._transport = null;
}
/*
 * Socket prototype
 */
Socket.prototype = {

    constructor: Socket,
    MAX_RECONNECTION_ATTEMPTS : 3,
    /**
     * Destroy everything.
     */
    destroy: function() {
        this.close();
        this.off();
        return this;
    },

    _newTransport: function() {
        this._transport = io.connect(wdDev.getSocketServer(), {
            transports: [
                'websocket',
                'htmlfile',
                'xhr-multipart',
                'xhr-polling',
                'jsonp-polling'
            ],
            'max reconnection attempts': this.MAX_RECONNECTION_ATTEMPTS
        });
    },

    connect: function() {
        if (this._transport) { return; }

        this._newTransport();

        return this;
    },

    _delegateEventListeners: function() {
        if (!this._transport) { return; }

        var self = this;
        var lastTimestamp = 0;

        this._transport.on('message', function onMessage(message) {
            try {
                message = JSON.parse(message);
            }
            catch (err) {
                $log.warn('Invalid message data: ', message);
                return;
            }
            $log.log('socket: ', message);
            lastTimestamp = message.timestamp;
            $rootScope.$apply(function() {
                self.trigger(message.type.replace('.', '_'), [message]);
            });
        });

        this._transport.on('connect', function() {
            GA('socket:connect');
            $rootScope.$broadcast('socket:connected');
        });

        this._transport.on('disconnect', function disconnect() {
            $log.error('Socket disconnected!');
        });

        this._transport.on('reconnecting', function reconnecting(reconnectionDelay, reconnectionAttempts) {
            $log.log('Socket will try reconnect after ' + reconnectionDelay + ' ms, for ' + reconnectionAttempts + ' times.');
            var MAX_GET_DEVICES_TIMES = 3;
            if (reconnectionAttempts === self.MAX_RECONNECTION_ATTEMPTS) {
                (function getDevices() {
                    wdGoogleSignIn.getDevices().then(function(list) {
                        var device = wdAuthToken.getToken();
                        var currentOnlineDevice = _.find(list, function(item) {
                            return item.id === device.id;
                        });

                        if (currentOnlineDevice) {
                            if (currentOnlineDevice.ip !== device.ip) {
                                wdAuthToken.setToken(currentOnlineDevice);
                                wdDev.setServer(currentOnlineDevice.ip);
                                wdGoogleSignIn.currentDevice(currentOnlineDevice);

                                self._newTransport();
                                self._transport.socket.reconnect();
                            } else {
                                $rootScope.$broadcast('socket:disconnected');

                                $rootScope.$on('socket:connect', function() {
                                    self._transport.socket.reconnect();
                                });
                            }
                        } else {
                            wdAuthToken.signout();
                        }
                    }, function() {
                        MAX_GET_DEVICES_TIMES -= 1;
                        if (MAX_GET_DEVICES_TIMES) {
                            getDevices();
                        } else {
                            wdAuthToken.signout();
                        }
                    });
                })();
            }
        });

        this._transport.on('reconnect', function reconnect() {
            $log.log('Socket reconnected!');

            $rootScope.$broadcast('socket:connected');
            self._transport.emit({
                type: 'notifications.request',
                timestamp : lastTimestamp 
            });
        });

        // There is a bug in socket.io, reconnect_failed gets never fired.
        this._transport.on('reconnect_failed', function failed() {
            $log.warn('Socket server seems cold dead...');
            GA('socket:dead');
        });

        this._transport.on('connect_failed', function() {
            // $log.warn('Socket fails to establish.');
            GA('socket:connect_failed');
        });
    },

    close: function() {
        if (this._transport) {
            this._transport.disconnect();
            this._transport.removeAllListeners();
            this._transport = null;
        }
        return this;
    }
};

return new Socket();

}];
});
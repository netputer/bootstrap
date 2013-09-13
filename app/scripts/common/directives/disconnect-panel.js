define([
        'text!templates/common/disconnect-panel.html'
    ], function(
        template
    ) {
'use strict';
return [function() {
    return {
        restrict: 'EAC',
        replace: true,
        template: template,
        scope: true,
        controller: [
                '$scope', '$rootScope', 'wdSocket', 'wdDevice',
        function($scope,   $rootScope,   wdSocket,   wdDevice) {
            var connectTimer = null;
            var DELAY_TIME = 10;
            $scope.connectDelayTime = DELAY_TIME;
            $scope.showPanel = false;

            var refreshDelayTime = function() {
                if (connectTimer) {
                    clearInterval(connectTimer);
                }

                $scope.connectDelayTime = DELAY_TIME;
                connectTimer = setInterval(function() {
                    $scope.$apply(function() {
                        $scope.connectDelayTime -= 1;
                        
                        if (!$scope.connectDelayTime) {
                            $scope.connectSocket();
                        }
                    });
                }, 1000);
            };

            wdSocket.on('socket:disconnected', function() {
                if (!$scope.showPanel) {
                    $scope.network = wdDevice.getDevice().attributes.ssid;
                    $scope.showPanel = true;

                    refreshDelayTime();
                }
                
            });

            wdSocket.on('socket:connected', function() {
                $scope.$apply(function() {
                    $scope.closePanel();
                });
            });

            $rootScope.$on('signout', function() {
                $scope.closePanel();
            });

            $scope.connectSocket = function() {
                wdSocket.trigger('socket:connect');
                refreshDelayTime();
            };

            $scope.closePanel = function() {
                $scope.showPanel = false;
                if (connectTimer) {
                    clearInterval(connectTimer);
                }
            };
        }]
    };
}];
});
define([], function(
    ) {
'use strict';
return [function() {
    var noop = function() {};
    return {
        scope: true,
        controller: ['wdAlert', '$scope', '$q', '$attrs', '$element',
        function(wdAlert, $scope, $q, $attrs, $element) {
            $scope.toggle = false;
            $scope.ok = noop;
            $scope.cancel = noop;
            $scope.header = '提示';
            $scope.content = '';

            wdAlert.registerModal({
                open: function(options) {
                    options = options || {};
                    var deferred = $q.defer();

                    if (options.header) {
                        $attrs.$set('header', options.header);
                    }
                    if (options.ok) {
                        $attrs.$set('buttonOkText', options.ok);
                    }
                    if (options.cancel) {
                        $attrs.$set('buttonCancelText', options.cancel);
                    }

                    $scope.content = options.content;
                    $scope.toggle = true;

                    $scope.ok = function() {
                        $scope.toggle = false;
                        deferred.resolve();
                    };
                    $scope.cancel = function() {
                        $scope.toggle = false;
                        deferred.reject();
                    };

                    $element.find('.modal-footer [bs-modal-cancel]').toggle(!options.onlyOk);

                    return deferred.promise;
                }
            });
        }],
        compile: function(element, attrs) {
            // Inject attrs into bsModul for using isolate scope.
            attrs.$set('toggle', 'toggle');
            attrs.$set('ok', 'ok()');
            attrs.$set('cancel', 'cancel()');
            // No need for linking, just depends on bsModal.
            return function() {};
        }
    };
}];
});

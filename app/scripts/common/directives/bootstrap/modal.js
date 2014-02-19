define([
        'underscore',
        'text!templates/bootstrap/modal.html'
    ], function(
        _,
        template
    ) {
'use strict';
return ['wdKey', function(wdKey) {
    return {
        replace: true,
        restrict: 'EAC',
        transclude: true,
        template: template,
        link: function($scope, element, attrs) {
            // Unique ID for keyboard shortcuts 'Scope' indication.
            var uid = _.uniqueId('modal_');
            var keyboardScope = null;
            // @options, no watch
            var options = $scope.$eval(attrs.options);
            var $header = element.find('.modal-header > h3');
            var $buttonOk = element.find('.modal-footer > [bs-modal-ok]');
            var $buttonCancel = element.find('.modal-footer > [bs-modal-cancel]');

            // Initialize modal widget.
            element.modal(_.defaults(options || {}, {
                show: false,
                // Manage shortcuts by wdKey
                keyboard: false,
                backdrop: 'static'
            }));

            function open() {
                keyboardScope = wdKey.push(uid);
                element.modal('show');
            }

            function close() {
                element.modal('hide');
                keyboardScope.done();
                keyboardScope = null;
            }

            attrs.$observe('header', function(header) {
                $header.text(header);
            });
            attrs.$observe('buttonOkText', function(ok) {
                $buttonOk.text(ok);
            });
            attrs.$observe('buttonCancelText', function(cancel) {
                $buttonCancel.text(cancel);
            });
            attrs.$observe('buttonOkDisabled', function(flag) {
                if (flag === 'true') {
                    $buttonOk.attr('disabled', true);
                }
                else {
                    $buttonOk.removeAttr('disabled');
                }
            });
            attrs.$observe('buttonCancelDisabled', function(flag) {
                if (flag === 'true') {
                    $buttonCancel.attr('disabled', true);
                }
                else {
                    $buttonCancel.removeAttr('disabled');
                }
            });

            $scope.$watch(attrs.toggle, function(value, oldValue) {
                if (value === oldValue) {
                    return;
                }
                if (value) {
                    open();
                }
                else {
                    close();
                }
            });

            element.on('click', '[bs-modal-ok]', function() {
                if (attrs.ok) {
                    $scope.$apply(attrs.ok);
                }
            });
            element.on('click', '[bs-modal-cancel]', function() {
                if (attrs.cancel) {
                    $scope.$apply(attrs.cancel);
                }
            });

            wdKey.$apply('enter', uid, function() {
                $scope.$eval(attrs.ok);
                return false;
            });
            wdKey.$apply('esc',   uid, function() {
                $scope.$eval(attrs.cancel);
                return false;
            });

            // Destruction
            $scope.$on('$destroy', function() {
                if (keyboardScope) {
                    keyboardScope.done();
                }
                wdKey.deleteScope(uid);
            });

        }
    };
}];
});

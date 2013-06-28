define([
    'fineuploader'
    ],function(fineuploader){
    return ['$scope','$http','wdDev','wdSocket','wdAlert','$route','GA','wdcApplications','wdKey',function($scope,$http,wdDev,wdSocket,wdAlert,$route,GA,wdcApplications,wdKey){

        //$scope相关
        //展示应用列表
        $scope.list = [];

        //当前显示的应用详情
        $scope.info = {};

        //新安装的应用列表
        $scope.newList = wdcApplications.getNewAppList();

        //版本监测
        $scope.serverMatchRequirement = $route.current.locals.versionSupport;

        //数据是否加载完毕
        $scope.dataLoaded = false;

        //全局
        //应用数据列表
        var G_appList = [];

        //上传进度相关
        var G_uploadingList = [];

        //当前的手机是否开启未知来源提示，false当前用户未开启，true开启
        var G_unknownTips = false;

        //显示联系人的按键
        var G_keyInfo;

        //最后一个选择的元素
        var G_lastChecked;

        //上传的实例
        var G_uploader;

        function getAppListData(data){
            $scope.isLoadShow = false;
            $scope.dataLoaded = true;
            $scope.isInstallBtnDisable = false;
            G_appList = wdcApplications.getApplications();
            $scope.list = G_appList;
            setTimeout(function(){
                uploadApk($('.installApp'));
            },300);
        };


        //取得具体应用的数据信息
        function getAppInfo(data,package_name){
            for(var i = 0 , l = data.length; i<l;i++ ){
                if(data[i]['package_name'] == package_name){
                    for(var m = 0 , n = data[i]['requested_permission'].length; m < n; m++ ){
                        data[i]['requested_permission'][m] = $scope.$root.DICT.applications.PERMISSIONS[data[i]['requested_permission'][m]] || data[i]['requested_permission'][m];
                    };

                    return data[i];
                };
            };
        };

        //删除单个应用
        function delApp(package_name){
            wdAlert.confirm(
                $scope.$root.DICT.applications.DEL_ONE_APP.TITLE,
                $scope.$root.DICT.applications.DEL_ONE_APP.CONTENT,
                $scope.$root.DICT.applications.DEL_ONE_APP.AGREE,
                $scope.$root.DICT.applications.DEL_ONE_APP.CANCEL
            ).then(function(){
                $http({
                    method: 'delete',
                    url: '/resource/apps/'+package_name
                }).success(function(data) {
                }).error(function(){
                });
                for(var i = 0 , l = $scope.list.length;i < l ; i++ ){
                    if($scope.list[i]['package_name'] == package_name ){
                        $scope.list[i]['confirmTipShow'] = true;
                        break;
                    };
                };
                var mask = $('.mask').css('opacity',0);
                setTimeout(function(){
                    mask.hide().find('.info').hide();
                    $('dd.confirm').css('opacity',0.8);
                },500);
            },function(){

            });
        };

        //删除多个
        function delMoreApps(){
            GA('Web applications : click the top uninstall button');
            wdAlert.confirm(
                $scope.$root.DICT.applications.DEL_MORE_APPS.TITLE,
                $scope.$root.DICT.applications.DEL_MORE_APPS.CONTENT,
                $scope.$root.DICT.applications.DEL_MORE_APPS.AGREE,
                $scope.$root.DICT.applications.DEL_MORE_APPS.CANCEL
            ).then(function(){
                var dels = [];
                for(var i = 0 , l = $scope.list.length ; i<l ; i++ ){
                    if( $scope.list[i]['checked'] == true ){
                        dels.push($scope.list[i]['package_name']);
                        $scope.list[i]['confirmTipShow'] = true;
                        $scope.list[i]['checked'] = false;
                    };
                };
                $scope.isDeleteBtnShow = false;
                setTimeout(function(){
                    $('dd.toolbar').css('opacity','');
                    $('dd.confirm').css('opacity',0.8);
                },500);

                var i = 0;
                del(dels[i]);
                function del(package_name){
                    $http({
                        method: 'delete',
                        url: '/resource/apps/'+ package_name
                    }).success(function(data) {
                        if(!!dels[i]){
                            del(dels[i]);
                            i++;
                        };
                    }).error(function(){
                    });
                };
            },function(){

            });
        };

        //上传APK
        function uploadApk(btnEles){
            for(var i = 0,l = btnEles.length;i<l;i++ ){

                G_uploader = new fineuploader.FineUploaderBasic({
                    button: btnEles[i],
                    request: {
                        endpoint: wdDev.wrapURL('/resource/apps/upload')
                    },
                    validation: {
                        allowedExtensions:['apk']
                    },
                    cors: {
                        expected: true,
                        sendCredentials: true
                    },
                    message:{
                        typeError:"The file's type is error!"
                    },
                    autoUpload: true,
                    callbacks: {
                        onSubmit: function(id,name) {
                            showUploadApp(id,name);
                            $('.wd-blank').hide();
                        },
                        onProgress: function(id,name,progress,total){
                            updateUpload(id,name,Math.floor(progress/total*100));
                        },
                        onComplete: function(id, name, data){
                            var result = data.result[0];
                            for(var i = 0, l = $scope.newList.length; i < l ; i++ ){
                                if($scope.newList[i]['id'] === id){
                                    $scope.newList[i]['package_name'] = result['package_name'];
                                    $scope.newList[i]['apk_path'] =  result['apk_path'];
                                    $scope.newList[i]['unknown_sources'] = result['unknown_sources'];
                                    if(!G_unknownTips){
                                        G_unknownTips = result['unknown_sources'];
                                    };
                                    if(!G_unknownTips){
                                        showUnknowTips();
                                    };
                                };
                            };
                        },
                        onerror:function(){
                        }
                    }
                });

                var dnd = new fineuploader.DragAndDrop({
                    dropArea: document.body,
                    multiple: true,
                    hideDropzones: false,
                    callbacks: {
                        dropProcessing: function(isProcessing, files) {
                            G_uploader.addFiles(files);
                        },
                        error: function(code, filename) {},
                        log: function(message, level) {}
                    }
                });
                dnd.setup();

            }

        };

        //上传安装应用时，显示对应的应用
        function showUploadApp(id,file_name){
            var item = {
                id : id,
                file_name:file_name,
                progress:'1%',
                progressShow:true,
                doneTipShow: false
            };
            $scope.newList.unshift(item);
            wdcApplications.setNewAppList($scope.newList);
            $scope.$apply();
        };

        //更新上传进度
        function updateUpload(id,name,progress){
            for(var i = 0 , l = $scope.newList.length; i < l ; i++ ){
                if( $scope.newList[i]['id'] === id ){
                    if( progress == 100 ){
                        $scope.newList[i]['confirmTipShow'] = true;
                        $scope.newList[i]['progressShow'] = false;
                        $('dd.confirm').css('opacity',0.8);
                        $scope.$apply();
                    }else{
                        $scope.newList[i]['progress'] = ""+progress+"%";
                        $scope.$apply();
                    };
                    break;
                };
            };
        };

        //显示未知来源应用提示
        function showUnknowTips(){
            var mask = $('.mask');
            var top = $(document).height()*0.2;
            mask.children('.unknowApkTips').show().css({
                'top':top
            });
            setTimeout(function(){
                mask.show();
                setTimeout(function(){
                    mask.css('opacity',1);
                },30);
            },200);
        };

        function reinstall(item){
            var apk_paths = [];
            if(!!item){
                GA('Web applications : click reinstall button');
                apk_paths.push({'apk_path':item['apk_path']});
            }else{
                GA('Web applications : click the complete button of unknown sources tips page');
                for(var i = 0,l = $scope.newList.length; i<l; i++ ){
                    apk_paths.push({'apk_path':$scope.newList[i]['apk_path']});
                };
                $('.mask').hide().children('.unknowApkTips').hide();
            };

            $http({
                method: 'post',
                url: '/resource/apps/install',
                data:apk_paths
            }).success(function(data) {

            }).error(function(){

            });
        };

        //上传之后或者过程中关闭那个应用
        function closeUploadApp(item){
            GA('Web applications : click cancel install button');
            for(var i = 0,l = $scope.newList.length;i<l;i++ ){
                if($scope.newList[i]['file_name'] == item['file_name']){
                    $scope.newList.splice(i,1);
                    break;
                };
            };
            if($scope.list.length == 0 && $scope.newList.length == 0){
                $('.wd-blank').show();
            };
        };

        //删除confirm提示
        function closeConfirm(item,e){
            $(e.target.parentNode.parentNode).find('.toolbar').css('opacity','');
            item['confirmTipShow'] = false;
            GA('Web applications : click cancel uninstall button');
        };

        //显示对应的应用
        function showAppInfo(package_name){
            GA('Web applications : show the app detail informations');
            G_keyInfo = wdKey.push('applications');
            var mask = $('.mask');
            $scope.info = getAppInfo(G_appList,package_name);
            setTimeout(function(){
                mask.show().children('.info').show();
                setTimeout(function(){
                    mask.css('opacity',1);
                },30);
            },200);
        };

        function closeMask(){
            G_keyInfo.done();
            var mask = $('.mask').css('opacity',0);
             setTimeout(function(){
                mask.hide();
                mask.find('.info').hide();
                mask.find('.unknowApkTips').hide();
            },500);
        };

        function deselectAll(){
            var eles = $('.apps-list dl dd.toolbar');
            GA('Web applications : click deselect all button');
            for(var i = 0, l = $scope.list.length; i < l ; i ++ ){
                $scope.list[i]['checked'] = false;
                eles.eq(i).css('opacity','');
            };
            $scope.isDeleteBtnShow = false;
            $scope.isDeselectBtnShow = false;
            $scope.selectedNum = 0;
        };

        function checkedApp(e, item){
            GA('Web applications : click Checkbox');
            if(item.checked){
                $scope.selectedNum += 1;
                $(e.target.parentNode.parentNode).css('opacity',1);
            }else{
                $scope.selectedNum -= 1;
                $(e.target.parentNode.parentNode).css('opacity','');
            };

            if(e.shiftKey){
                GA('Web Applications : press shift and click checkbox checked');
                var startIndex = Math.max($scope.list.indexOf(G_lastChecked), 0);
                var stopIndex = $scope.list.indexOf(item);
                $scope.list.slice(Math.min(startIndex, stopIndex), Math.max(startIndex, stopIndex) + 1).forEach(function(v,i) {
                    if(!v['checked']){
                        v['checked'] = true;
                        $scope.selectedNum += 1;
                    }
                });

                var ele = $('dd.toolbar');
                for (var i = startIndex ; i <= stopIndex; i += 1 ){
                    ele.eq(i).css('opacity',1);
                }
            }

            if($scope.selectedNum > 0){
                $scope.isDeleteBtnShow = true;
                $scope.isDeselectBtnShow = true;
            }else{
                $scope.isDeleteBtnShow = false;
                $scope.isDeselectBtnShow = false;
            }

            G_lastChecked = item ;
        };

        function showToolbar() {
            $scope.selectedNum = 0;

            var eles = $('.apps-list .old-list');
            for (var i = 0 , l = $scope.list.length ; i < l ; i += 1) {
                if($scope.list[i]['checked']){
                    $scope.selectedNum += 1;
                    eles.eq(i).find('dd.toolbar').css('opacity',1);
                }
            }
            if($scope.selectedNum > 0){
                $scope.isDeleteBtnShow = true;
                $scope.isDeselectBtnShow = true;
            }else{
                $scope.isDeleteBtnShow = false;
                $scope.isDeselectBtnShow = false;
            }
            var newListEles = $('.apps-list .new-list');
            for (var i = 0 , l = $scope.newList.length ; i < l ; i += 1) {
                if($scope.newList[i]['confirmTipShow']){
                    newListEles.eq(i).find('dd.confirm').css('opacity',1);
                }
            }

            $scope.$apply();
        }

        function clickInstallApk(){
            GA('Web applications :click install apk button');
        };

        function clickHoverUninstall(){
            GA('Web applications : click the hover uninstall button');
        };

        function clickInfoUninstall(){
            GA('Web applications : click the uninstall button of detail info page');
        };

        function clickRetryUninstall(){
            GA('Web applications : click retry uninstall button');
        };

        //webSocket处理
        wdSocket
            .on('app_install', function(e, message) {
                var name = message.data.packageName;
                $http({
                    method: 'get',
                    url: '/resource/apps/'+name
                }).success(function(data){
                    for(var i = 0,l = $scope.newList.length;i<l; i++ ){
                        if( $scope.newList[i]['package_name'] == data['package_name'] ){
                            $scope.newList.splice(i,1);
                            break;
                        };
                    };

                    //如果已经安装，移除掉之前版本
                    for(var i = 0,l = $scope.list.length; i<l; i++ ){
                        if($scope.list[i]['package_name'] == data['package_name'] ){
                            $scope.list.splice(i,1);
                            break;
                        };
                    };
                    data['doneTipShow'] = true;
                    $scope.list.unshift(wdcApplications.changeInfo(data));
                    setTimeout(function(){
                        data['doneTipShow'] = false;
                        $scope.$apply();
                    },4000);
                }).error(function(){
                });
            })
            .on('app_uninstall', function(e, message) {
                var name = message.data.packageName;
                for(var i = 0,l = $scope.list.length;i<l;i++ ){
                    if($scope.list[i]['package_name']==name){
                        $scope.list.splice(i,1);
                        $scope.$apply();
                        break;
                    };
                };
                if( ($scope.list.length == 0) && ($scope.newList.length == 0) ){
                    setTimeout(function(){
                        uploadApk($('.installApp'));
                    },300);
                };
                showToolbar();
            });

        wdKey.$apply('esc', 'applications', function() {
            GA('Web Applications:press esc and close the application info page');
            closeMask();
        });

        $scope.$on('$destroy', function() {
            wdKey.deleteScope('applications');
        });

        //主程序
        $scope.isLoadShow = true;
        $scope.selectedNum = 0;
        $scope.isDeleteBtnShow = false;
        $scope.isDeselectBtnShow = false;
        $scope.isInstallBtnDisable = true;

        wdcApplications.onchange(getAppListData);
        setTimeout(showToolbar,150);

        //需要挂载到socpe上面的方法
        $scope.showAppInfo = showAppInfo;
        $scope.closeMask = closeMask;
        $scope.closeConfirm = closeConfirm;
        $scope.checkedApp = checkedApp;
        $scope.delApp = delApp;
        $scope.delMoreApps = delMoreApps;
        $scope.closeUploadApp = closeUploadApp;
        $scope.reinstall = reinstall;
        $scope.deselectAll = deselectAll;
        $scope.clickInstallApk = clickInstallApk;
        $scope.clickHoverUninstall = clickHoverUninstall;
        $scope.clickInfoUninstall = clickInfoUninstall;
        $scope.clickRetryUninstall = clickRetryUninstall;

//最后的括号
    }];
});

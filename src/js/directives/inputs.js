angular
    .module('a-edit')

    .directive('textInput', ['$timeout', '$compile', function($timeout, $compile) {
        function getTemplateByType(type, options){
            var text = '{{$parent.ngModel}}';
            if(options && options.modal_link)
                text = '<a a-model-modal="modalModel" on-save="save()" href>' + text + '</a>';

            return '' +
            '<div ng-if="!isEdit">' +
                (type == 'text' ? text : '<pre ng-if="$parent.ngModel">{{$parent.ngModel}}</pre>') +
            '</div>' +
            '<div ng-if="isEdit">' +
                (type == 'text' ? '<input type="text"' : '<textarea ') +
                ' class="form-control input-sm" placeholder="{{$parent.placeholder}}"' +
                ' ng-model="$parent.ngModel" ng-enter="$parent.save()"' +
                ' ng-style="{ \'width\' : $parent.width + \'px\'}">' +
                (type == 'textarea' ? '</textarea>' : '') +
            '</div>';
        }

        var typeTemplates = {
            'text': $compile(getTemplateByType('text')),
            'text_modal_link': $compile(getTemplateByType('text', {modal_link: true})),
            'textarea': $compile(getTemplateByType('textarea'))
        };

        return {
            restrict: 'E',
            scope: {
                //require
                ngModel: '=',
                ngModelStr: '=?',
                isEdit: '=?',
                modalModel: '=?',
                //callbacks
                ngChange: '&',
                onSave: '&',
                //sub
                placeholder: '@',
                name: '@',
                width: '@',
                type: '@' //text or textarea
            },
            link: function (scope, element, attrs) {
                scope.type = scope.type || 'text';
                if(attrs.modalModel && scope.type == 'text')
                    scope.type = "text_modal_link";

                var template = typeTemplates[scope.type],
                    templateElement;

                template(scope, function (clonedElement, scope) {
                    templateElement = clonedElement;
                    element.append(templateElement);
                });

                template = null;

                element.on("$destroy", function () {
                    templateElement.remove();
                    templateElement = null;
                });

                scope.save = function(){
                    if(scope.onSave)
                        $timeout(scope.onSave);
                }
            }
        };
    }])

    .directive('dateInput', ['$timeout', '$filter', function($timeout, $filter) {
        return {
            restrict: 'E',
            templateUrl: 'a-edit-date-input.html',
            scope: {
                //require
                ngModel: '=',
                ngModelStr: '=?',
                ngModelSubStr: '=?',
                isEdit: '=',
                //callbacks
                ngChange: '&',
                onSave: '&',
                //sub
                placeholder: '@',
                name: '@'
            },
            link: function (scope, element) {

                scope.getDayClass = function(obj) {
                    if (obj.mode === 'day') {
                        var day = new Date(obj.date).getDay();
                        if (day == 0 || day == 6)
                            return 'day-off';
                    }
                };

                scope.options = {
                    startingDay: 1,
                    customClass: scope.getDayClass,
                    todayText: '',
                    currentText:'',
                    clearText: '',
                    closeText: 'РЎРѕС…СЂР°РЅРёС‚СЊ',
                    appendToBody: false
                };

                scope.save = function(){
                    if(scope.onSave)
                        $timeout(scope.onSave);
                };

                scope.change = function(){
                    setStr();

                    if(scope.ngChange)
                        $timeout(scope.ngChange);
                };
                function setStr(){
                    if(scope.ngModel){
                        scope.ngModelStr = $filter('amDateFormat')(scope.ngModel, 'D MMM. YYYY');
                        scope.ngModelSubStr = $filter('amDateFormat')(scope.ngModel, 'DD.MM.YYYY');
                    }
                }

                scope.$watch('ngModel', setStr);
            }
        };
    }])

    .directive('selectInput', ['$timeout', '$compile', function($timeout, $compile) {
        function getTemplateByType(type){
            return '' +
                '<div class="select-input-container">' +
                    '<span ng-if="!isEdit">{{selectedName}}</span>' +
                    '<input type="hidden" name="{{name}}" ng-bind="ngModel" class="form-control" required />' +
                    '<ui-select ' + (type == 'multiselect' ? 'multiple close-on-select="false"' : '') + ' ng-model="options.value" ng-if="isEdit" ng-click="changer()" class="input-small">' +
                        '<ui-select-match placeholder="">' +
                            '{{' + (type == 'multiselect' ? '$item.name' : '$select.selected.name') + '}}' +
                        '</ui-select-match>' +

                        '<ui-select-choices repeat="item.id as item in $parent.list track by $index">' +
                            '<div ng-bind-html="item.name | highlight: $select.search"></div>' +
                        '</ui-select-choices>' +
                    '</ui-select>' +
                '</div>';
        }

        var typeTemplates = {
            'select': $compile(getTemplateByType('')),
            'multiselect': $compile(getTemplateByType('multiselect'))
        };

        return {
            restrict: 'E',
            require: 'ngModel',
            scope: {
                //require
                list: '=',
                ngModel: '=',
                ngModelStr: '=?',
                isEdit: '=?',
                //callbacks
                ngChange: '&',
                onSave: '&',
                //sub
                multiselect: '=',
                placeholder: '@',
                name: '@',
                type: '@' //select or multiselect
            },
            link: function (scope, element, attrs, ngModel) {
                scope.options = {
                    value: ''
                };

                var template = typeTemplates[scope.type || 'select'],
                    templateElement;

                template(scope, function (clonedElement, scope) {
                    templateElement = clonedElement;
                    element.append(templateElement);
                });

                template = null;

                element.on("$destroy", function () {
                    templateElement.remove();
                    templateElement = null;
                });

                scope.changer = function() {
                    ngModel.$setViewValue(scope.options.value)
                };

                scope.$watch('ngModel', function(newVal){

                    if(scope.options.value == newVal)
                        return;

                    scope.options.value = newVal;

                    scope.setSelectedName (newVal);
                });

                //TODO: optimize
                scope.$watch(function() {
                    return ngModel.$viewValue;
                }, function(newVal) {
                    scope.ngModel = newVal;
                    scope.setSelectedName (newVal);
                });

                scope.$watch('list', function(){
                    scope.setSelectedName (scope.ngModel);
                });

                scope.setSelectedName = function (newVal){
                    if(Array.isArray(newVal)){
                        var names = [];
                        newVal.forEach(function(val){
                            names.push(getNameById(val));
                        });
                        scope.selectedName = names.join(', ');
                    } else {
                        scope.selectedName = getNameById(newVal);
                    }

                    scope.ngModelStr = scope.selectedName;
                };

                //TODO: to helper
                function getNameById (val){
                    var resultName = '';

                    if(!scope.list || !scope.list.length)
                        return resultName;

                    scope.list.some(function(obj){
                        var result = obj.id == val;
                        if(result)
                            resultName = obj.name;
                        return result;
                    });
                    return resultName;
                }

                scope.save = function(){
                    if(scope.onSave)
                        $timeout(scope.onSave);
                }
            }
        };
    }])

    .directive('fileUpload', ['$timeout', '$compile', 'FileUploader', function($timeout, $compile, FileUploader) {

        function getTemplateByType(type){
            var result = '';
            if(type == 'multifile'){
                result +='<ul class="list-unstyled">' +
                            '<li ng-repeat="item in ngModel">';
            }

            result += '<popover-image ng-model="' + (type == 'multifile' ? 'item' : 'ngModel') + '.file" text="' + (type == 'multifile' ? 'item' : 'ngModel') + '.name"></popover-image>';

            if(type == 'multifile'){
                result +=   '</li>' +
                        '</ul>';
            }

            result +=   '<ul ng-if="isEdit" class="list-unstyled">' +
                            '<li ng-repeat="item in uploader.queue">' +
                                '<popover-image ng-model="item.file" text="item.file.name"></popover-image>' +
                                '<a href ng-click="item.remove()"><span class="glyphicon glyphicon-remove"></span></a>' +
                            '</li>' +
                        '</ul>' +
                        '<span ng-if="isEdit && uploader" class="btn btn-sm btn-default btn-file">' +
                            'Р—Р°РіСЂСѓР·РёС‚СЊ' +
                            '<input type="file" nv-file-select uploader="uploader" ' + (type == 'multifile' ? 'multiple': '') + ' />' +
                        '</span>';

            return result;
        }

        var typeTemplates = {
            'file': $compile(getTemplateByType('file')),
            'multifile': $compile(getTemplateByType('multifile'))
        };

        return {
            restrict: 'E',
            require: 'ngModel',
            scope: {
                ngModel: '=',
                isEdit: '=?',
                uploader: '=',
                //callbacks
                ngChange: '&',
                onSave: '&',
                //sub
                inputName: '@',
                url: '@',
                type: '@'
            },
            link: function (scope, element, attrs, ngModel) {

                var template = typeTemplates[scope.type || 'file'],
                    templateElement;

                template(scope, function (clonedElement, scope) {
                    templateElement = clonedElement;
                    element.append(templateElement);
                });

                template = null;

                element.on("$destroy", function () {
                    templateElement.remove();
                    templateElement = null;
                });

                function initUploader(){
                    scope.uploader = new FileUploader();
                    scope.uploader.url = scope.url;
                    scope.uploader.alias = scope.inputName;
                    scope.uploader.autoUpload = true;
                    scope.uploader.removeAfterUpload = true;

                    scope.uploader.onAfterAddingFile = function(item){
                        setImageSrc(item);
                    };
                    scope.uploader.onSuccessItem = function(item, response){
                        if(!scope.ngModel)
                            scope.ngModel = [];

                        scope.ngModel.push(response);
                        console.log(scope.ngModel);
                    };
                }

                if(scope.isEdit)
                    initUploader();

                function setImageSrc (item){
                    var reader = new FileReader();

                    reader.onload = (function(theFile) {
                        return function(e) {
                            item.image_src = e.target.result;
                            scope.$apply();
                        };
                    })(item._file);

                    reader.readAsDataURL(item._file);
                }

                scope.save = function(){
                    if(scope.onSave)
                        $timeout(scope.onSave);
                };

                scope.$watch('ngModel', function(newVal){
                    if(!newVal && scope.isEdit)
                        initUploader();
                });
                scope.$watch('isEdit', function(newVal){
                    if(newVal)
                        initUploader();
                })
            }
        };
    }]);
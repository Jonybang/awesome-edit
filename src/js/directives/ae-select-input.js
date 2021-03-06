angular
    .module('a-edit')
    .directive('aeSelectInput', ['$timeout', '$filter', '$compile', '$templateCache', '$mdDialog', 'AEditHelpers' ,'AEditConfig', '$q', function($timeout, $filter, $compile, $templateCache, $mdDialog, AEditHelpers, AEditConfig, $q) {
        function getTemplateByType(type, options){
            options = options || {};

            var mdSelect = {
                //attributes: '',
                //match: 'selectedName',
                //itemId: 'item.id',
                itemName: 'getNameFromObj(item)',
                //subClasses: ''
            };

            var template = '<label ng-if="!viewMode">{{label}}</label>';
            if(type == 'select' || type == 'textselect') {
                template += '<span ng-if="viewMode">{{getNameFromObj(options.selected)}}</span>';
            }

            if(type == 'multiselect') {
                template += '' +
                    '<md-chips ng-model="options.selected" md-on-remove="removeFromMultiSelect($chip)">' +
                        '<md-chip-template ng-dblclick="editItem(objectsById[$chip])">' +
                            '<span>{{getNameFromObj(objectsById[$chip])}}</span>' +
                        '</md-chip-template>';
            }

            template +=
                        '<md-autocomplete ' +
                            (type == 'select' || type == 'textselect' ? ' md-selected-item="$parent.options.selected" ' : ' ') +
                            'ng-if="!viewMode"' +
                            'id="{{id}}" ' +
                            'md-input-name="{{name}}" ' +
                            'ng-required="{{ngRequired}}" ' +
                            'md-require-match="ngRequired" ' +
                            'md-clear-button="!disallowClear" ' +
                            'md-search-text="options.search" ' +
                            'md-items="item in getListByResource()" ' + // | filter:options.search"
                            'md-no-cache="true" ' +
                            'ng-disabled="ngDisabled" ' +
                            'md-search-text-change="debouncedGetList()" ' +
                            'md-selected-item-change="selectedItemChange(item)" ' +
                            'md-item-text="' + mdSelect.itemName + '" ' +
                            'md-min-length="autoCompleteMinLength" ' +
                            'placeholder="{{placeholder}}"' +
                            '> ' +
                                '<md-item-template> ' +
                                    '<span md-highlight-text="options.search" md-highlight-flags="^i">{{' + mdSelect.itemName + '}}</span> ' +
                                '</md-item-template>' +
                                '<md-not-found>' +
                                    AEditConfig.locale.not_found + ' <a href ng-click="editItem(null)" ng-show="adder">' + AEditConfig.locale.create_new_question + '</a>' +
                                '</md-not-found>' +
                        '</md-autocomplete>';


            if(type == 'multiselect') {
                template += '' +
                    '</md-chips>';
            }

            return template;
        }

        var typeTemplates = {
            'select': $compile(getTemplateByType('select')),
            'textselect': $compile(getTemplateByType('textselect')),
            'multiselect': $compile(getTemplateByType('multiselect'))
        };

        return {
            restrict: 'E',
            require: 'ngModel',
            scope: {
                //require
                list: '=?',
                ngModel: '=',
                params: '=?',
                ngModelStr: '=?',
                viewMode: '=?',
                hasError: '=?',
                disallowClear: '=?',
                ngRequired: '=?',
                ngDisabled: '=?',

                ngResource: '=?',
                ngResourceFields: '=?',

                refreshListOn: '=?',

                //callbacks
                ngChange: '&',
                onSave: '&',
                onSelect: '&',
                onRemove: '&',
                //sub
                adder: '=?',
                getList: '=?',
                idAsName: '=?',
                nameField: '@',
                orNameField: '@',
                placeholder: '@',
                defaultValue: '@',
                label: '@',
                name: '@',
                type: '@' //select or multiselect
            },
            link: function (scope, element, attrs, ngModel) {
                scope.id = 'ae-edit-select-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
                //=============================================================
                // Config
                //=============================================================
                var variables = angular.extend({}, AEditConfig.grid_options.request_variables, AEditConfig.grid_options.response_variables);

                scope.autoCompleteMinLength = 0;
                scope.refreshDelay = AEditConfig.select_options.refresh_delay;
                scope.resetSearchInput = AEditConfig.select_options.reset_search_input;

                scope.options = {
                    selected: scope.type == 'multiselect' ? [] : null,
                    search: ''
                };

                scope.full_type = scope.type = scope.type || 'select';
                if(scope.adder)
                    scope.full_type += '-adder';

                if(attrs.defaultValue)
                    scope.ngModel = scope.defaultValue;

                scope.fakeModel = scope.ngModel;

                //=============================================================
                // Compile
                //=============================================================

                typeTemplates[scope.type](scope, function (clonedElement, scope) {
                    element.empty();
                    element.append(clonedElement);
                });

                //=============================================================
                // Output validation
                //=============================================================
                //scope.$watch('hasError', function(hasError){
                //    scope.input_class = hasError ? "has-error" : '';
                //});

                //=============================================================
                // Callbacks
                //=============================================================
                scope.selectedItemChange = function(obj){

                    if(scope.type == 'select')  {
                        scope.fakeModel = scope.options.selected ?  scope.options.selected.id || scope.options.selected.value : null;
                    } else if(scope.type == 'multiselect'){
                        if(!obj)
                            return;
                        scope.options.selected = scope.options.selected ?  scope.options.selected.filter(function(obj){return !angular.isObject(obj);}) : [];
                        scope.fakeModel = scope.options.selected;

                        scope.options.selected.push(obj.id);
                        if(!scope.objectsById)
                            scope.objectsById = {};
                        scope.objectsById[obj.id] = obj;
                        scope.options.search = '';
                    } else if(scope.type == 'textselect'){
                        scope.fakeModel = scope.options.selected;
                    }

                    scope.ngModel = scope.fakeModel;

                    //scope.options.search = '';

                    getList();

                    $timeout(function () {
                        if(scope.onSelect){
                            if(angular.isObject(obj))
                                scope.onSelect({item: obj.id});
                            else
                                scope.onSelect({item: obj});
                        }
                    });

                    $timeout(scope.ngChange);
                };

                scope.removeFromMultiSelect = function(item){
                    $timeout(scope.ngChange);
                    $timeout(function () {
                        if (scope.onRemove)
                            scope.onRemove({item: item});
                    });

                    if(scope.ngModel.includes(item))
                        scope.ngModel.splice(scope.ngModel.indexOf(item), 1);
                    scope.fakeModel = scope.ngModel;
                    scope.setSelected();
                };

                scope.$watch('ngModel', function(newVal){
                    if(scope.fakeModel == newVal)
                        return;

                    if(Array.isArray(scope.fakeModel) && Array.isArray(newVal)){
                        if(scope.fakeModel.length == newVal.length
                            && scope.fakeModel.every(function(v,i) { return v === newVal[i]}))
                            return
                    }

                    if(!newVal)
                        scope.options.search = '';

                    scope.fakeModel = newVal;

                    if(scope.type == 'multiselect' && angular.isObject(scope.fakeModel)){
                        var fixedFakeModel = [];
                        angular.forEach(scope.fakeModel, function(value){
                            fixedFakeModel.push(value);
                        });
                        scope.fakeModel = fixedFakeModel;
                        scope.ngModel = fixedFakeModel;
                    }

                    scope.options.selected = null;
                    scope.setSelected();
                });

                //=============================================================
                // Init select list
                //=============================================================
                var last_resource = scope.ngResource;
                function initListGetByResource(){
                    if(!scope.ngResource || !scope.getList || (scope.local_list && scope.local_list.length)){
                        if(last_resource == scope.ngResource){
                            return;
                        }
                    }

                    if(last_resource != scope.ngResource){
                        scope.options.selected = null;
                        scope.objectsById = null;
                    }

                    getList();

                    last_resource = scope.ngResource;
                }

                function getList(resolve, reject){
                    if(!scope.ngResource){
                        if(!scope.local_list)
                            scope.local_list = [];

                        var filtred = $filter('filter')(scope.local_list, scope.options.search);

                        filtred = filtred.filter(function (item) {
                            if(scope.type == 'multiselect' && scope.ngModel && scope.ngModel.length)
                                return scope.ngModel.indexOf(item.id) == -1;
                            else if(scope.type == 'select')
                                return scope.ngModel != (item.id || item.value);
                            else
                                return true;
                        });

                        if(angular.isFunction(resolve))
                            resolve(filtred);

                        return filtred;
                    }

                    var request_options = angular.extend({}, scope.params || {});
                    if(scope.options.search)
                        request_options[variables['query']] = scope.options.search;
                    else
                        delete request_options[variables['query']];

                    request_options[variables['limit']] = AEditConfig.select_options.items_per_page;

                    if(scope.type == 'multiselect' && scope.objectsById)
                        request_options[variables['id_not_in']] = scope.ngModel && scope.ngModel.length ? scope.ngModel.join(',') : [];

                    return AEditHelpers.getResourceQuery(scope.ngResource, 'get', request_options).then(function(list){
                        //var isResourceWasReinit = scope.ngModel && scope.ngModel.length && !scope.objectsById
                        scope.local_list = list;

                        if(scope.fakeModel)
                            scope.setSelected();

                        if(scope.type == 'multiselect' && scope.ngModel && scope.ngModel.length){
                            scope.local_list = list.filter(function(item){
                                return !scope.ngModel.includes(item.id);
                            });
                        }

                        if(angular.isFunction(resolve))
                            resolve(scope.local_list);
                    }, function(response){
                        if(angular.isFunction(reject))
                            reject(response);
                    });
                }

                scope.debouncedGetList = AEditHelpers.debounce(getList, 300);
                scope.getListByResource = function (){
                    return $q(scope.debouncedGetList);
                };

                var debouncedInitList = AEditHelpers.debounce(initListGetByResource, 300);

                scope.$watch('ngResource', debouncedInitList);
                scope.$watch('refreshListOn', debouncedInitList);
                scope.$watchCollection('params', getList);

                //=============================================================
                // Output non edit mode
                //=============================================================
                scope.$watch('list', function(list){
                    scope.local_list = angular.copy(list);
                    scope.setSelected();
                });

                scope.setSelected = function(){
                    if((!scope.local_list || !scope.local_list.length) && !scope.idAsName)
                        return;

                    if(scope.type == 'textselect'){
                        scope.options.selected = scope.ngModel ? scope.ngModel : '';
                        return;
                    }

                    if(scope.type == 'multiselect'){
                        if(!scope.objectsById)
                            scope.objectsById = {};
                        if(!scope.ngModel || !scope.ngModel.length){
                            scope.options.selected = [];
                            return;
                        }
                        else if(scope.options.selected && scope.options.selected.length && scope.fakeModel.length == scope.options.selected.length)
                            return;

                        scope.options.selected = angular.copy(scope.ngModel);

                        scope.ngModel.forEach(function(id, index){
                            if(scope.objectsById[id])
                                return;

                            if(scope.idAsName){
                                scope.objectsById[id] = {
                                    id: id,
                                    name: id
                                };
                                return;
                            }

                            var foundItem = null;
                            scope.local_list.some(function(item){
                                if(item.id == id)
                                    foundItem = item;

                                return item.id == id;
                            });

                            if(foundItem){
                                scope.objectsById[foundItem.id] = foundItem;
                            } else {
                                getObjectFromServer(id).then(function(serverItem){
                                    if(serverItem)
                                        scope.objectsById[serverItem.id] = serverItem;
                                })
                            }
                        });
                    } else if(scope.type == 'select')  {
                        if(!scope.ngModel){
                            scope.options.selected = null;
                            if(scope.options.search)
                                return;

                            closeSelectList();
                            return;
                        } else if(scope.options.selected){
                            return;
                        }

                        var found = scope.local_list.some(function(item){
                            if(item.id == scope.ngModel || item.value == scope.ngModel)
                                scope.options.selected = item;

                            return item.id == scope.ngModel;
                        });
                        if(!found && scope.ngResource){
                            getObjectFromServer(scope.ngModel).then(function(serverItem){
                                scope.options.selected = serverItem;
                            })
                        }
                    }
                };

                function getObjectFromServer(id){
                    return AEditHelpers.getResourceQuery(scope.ngResource, 'show', {id: id});
                }

                function closeSelectList(){
                    scope.autoCompleteMinLength = 1;
                    scope.options.search = '';
                    $timeout(function () {
                        scope.autoCompleteMinLength = 0;
                        angular.element(element).find('input').blur();
                    }, 500);
                }

                scope.getNameFromObj = function(obj){
                    if(!obj)
                        return '';

                    if(scope.type == 'textselect' || angular.isString(obj))
                        return obj;

                    function getFieldByName(nameField){
                        var objProp = angular.copy(obj);
                        nameField.split('.').forEach(function(partOfName){
                            if(objProp)
                                objProp = objProp[partOfName];
                        });
                        return objProp || '';
                    }

                    if(!scope.nameField || (scope.nameField.indexOf('.') == -1 && scope.nameField.indexOf('+') == -1))
                        return obj[scope.nameField] || obj.name || obj[scope.orNameField];
                    else {
                        if(scope.nameField.indexOf('+') != -1){
                            var result = '';
                            scope.nameField.split('+').forEach(function(fieldname, index){
                                var fieldValue = getFieldByName(fieldname);
                                if(!fieldValue)
                                    return;

                                if(index > 0)
                                    result += ' (';

                                result += fieldValue;

                                if(index > 0)
                                    result += ')';
                            });
                            return result;
                        } else {
                            return getFieldByName(scope.nameField);
                        }
                    }
                };

                scope.editItem = function(item){
                    if(scope.type == 'textselect' || !scope.ngResourceFields || !scope.ngResourceFields.length)
                        scope.ngResourceFields = [{name: scope.nameField || 'name' || scope.orNameField, label: ''}];

                    var inputsHtml = '';
                    var data = { lists: {}, configs: {}, object: item || {}, fields: scope.ngResourceFields };

                    scope.ngResourceFields.forEach(function(field){
                        if(!item || !item.id){
                            if(field.name == scope.nameField || field.name == 'name' || field.name == scope.orNameField){
                                data.object[field.name] = scope.options.search;
                                //field.default_value = scope.options.search;
                            }
                        }

                        inputsHtml += '<div class="ae-select-input-dialog-field" flex="grow" layout="row" layout-fill>' + AEditHelpers.generateDirectiveByConfig(field, {
                                            item_name: 'object',
                                            lists_container: 'lists',
                                            always_edit: true,
                                            get_list: true,
                                            is_new: true,
                                            list_variable: 'lists.' + field.name + '_list',
                                            config_variable: 'configs.' + field.name + '_config',
                                            input_name: field.name
                                            //already_modal: true
                                        }, data.object) + '</div>';

                        data.lists[field.name + '_list'] = angular.isArray(field.list) ? field.list : [];
                        data.configs[field.name + '_config'] = angular.isObject(field.config) ? field.config : {};

                        if(field.resource){
                            data[field.name + '_resource'] = field.resource;
                        }

                        if(field.type == 'multiselect'){
                            data.object[field.name] = [];
                        }
                    });

                    closeSelectList();

                    // var position = $mdPanel.newPanelPosition()
                    //     .relativeTo('#' + scope.id)
                    //     .addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.BELOW);

                    $mdDialog.show({
                        clickOutsideToClose: false,
                        focusOnOpen: true,
                        hasBackdrop: true,
                        panelClass: 'md-background md-hue-3',
                        locals: {
                            data: data
                        },
                        controller: ['$scope', '$mdDialog', 'data', function ($scope, $mdDialog, data) {
                            angular.extend($scope, data);

                            $scope.isDisabled = function(){
                                return scope.ngResourceFields.some(function(field){
                                    return field.required && !$scope.object[field.name];
                                });
                            };

                            $scope.save = function() {
                                $scope.form.$setSubmitted();

                                if(!$scope.form.$valid)
                                    return;

                                $mdDialog.hide($scope.object);
                            };
                            $scope.cancel = function() {
                                $mdDialog.cancel();
                            };
                        }],
                        template: '' +
                        '<md-dialog>' +
                            '<md-toolbar class="md-primary"><div class="md-toolbar-tools"><h4>' + AEditConfig.locale.create_new + '</h4><span class="flex"></span><md-button class="md-icon-button" ng-click="cancel()"><md-icon>close</md-icon></md-button></div></md-toolbar>' +
                            '<md-dialog-content layout="row" class="padding padding-top" layout-wrap>' +
                                '<form name="form" layout="column" flex="grow">' +
                                    '<md-content layout="row" layout-wrap>' +
                                        inputsHtml +
                                    '</md-content>' +
                                '</form>' +
                            '</md-dialog-content>' +
                            '<md-dialog-actions>' +
                                '<md-button ng-click="save()" ng-disabled="isDisabled()">' + AEditConfig.locale.save + '</md-button>' +
                                '<md-button ng-click="cancel()">' + AEditConfig.locale.cancel + '</md-button>' +
                            '</md-dialog-actions>' +
                        '</md-dialog>'
                    }).then(function(savedItem){
                        saveToList(item, savedItem)
                    });
                };

                //=============================================================
                // Add new item to select list by adder
                //=============================================================
                function saveToList (editedItem, savedItem){
                    if(scope.type == 'textselect'){
                        //get first property of object and add it to list
                        var is_first_prop = true;
                        angular.forEach(savedItem, function(prop_value){
                            if(is_first_prop){
                                scope.local_list.unshift(prop_value);
                                scope.ngModel = prop_value;
                            }
                            is_first_prop = false;
                        });
                        return;
                    }

                    AEditHelpers.getResourceQuery(new scope.ngResource(angular.extend(editedItem || {}, savedItem, scope.params || {})), editedItem ? 'update' : 'create').then(function(object){
                        scope.options.search = '';

                        if(scope.type == 'multiselect'){
                            if(scope.fakeModel.includes(object.id))
                                scope.objectsById[object.id] = object;
                            else
                                scope.fakeModel.push(object.id);
                        } else if(scope.type == 'select'){
                            scope.fakeModel = object.id;
                        }

                        scope.ngModel = scope.fakeModel;

                        scope.setSelected();

                        $timeout(scope.onSelect);
                        $timeout(scope.ngChange);
                    });
                }
            }
        };
    }]);
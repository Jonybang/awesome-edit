angular
    .module('a-edit')

    .directive('aeSelectInput', ['$timeout', '$compile', '$templateCache', '$mdPanel', 'AEditHelpers' ,'AEditConfig', function($timeout, $compile, $templateCache, $mdPanel, AEditHelpers, AEditConfig) {
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
                    '<md-chips ng-model="options.selected">' +
                        '<md-chip-template>' +
                            '<span>{{getNameFromObj($chip)}}</span>' +
                        '</md-chip-template>';
            }

            template +=
                        '<md-autocomplete ' +
                            (type == 'select' || type == 'textselect' ? 'ng-if="!viewMode" md-selected-item="$parent.options.selected" ' : ' ') +
                            'id="{{id}}" ' +
                            'md-search-text="options.search" ' +
                            'md-items="item in local_list | filter:options.search" ' +
                            'ng-disabled="ngDisabled" ' +
                            'md-search-text-change="getListByResource(options.search)" ' +
                            'md-selected-item-change="selectedItemChange(item)" ' +
                            'md-item-text="' + mdSelect.itemName + '" ' +
                            'md-min-length="0" ' +
                            'placeholder="{{placeholder}}"> ' +
                                '<md-item-template> ' +
                                    '<span md-highlight-text="options.search" md-highlight-flags="^i">{{' + mdSelect.itemName + '}}</span> ' +
                                '</md-item-template>' +
                                '<md-not-found>' +
                                    'Not found. <a ng-click="newItem(options.search)" ng-show="adder">Create a new one?</a>' +
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
                ngModelStr: '=?',
                viewMode: '=?',
                hasError: '=?',

                ngResource: '=?',
                ngResourceFields: '=?',

                refreshListOn: '=?',

                //callbacks
                ngChange: '&',
                onSave: '&',
                onSelect: '&',
                //sub
                adder: '=?',
                getList: '=?',
                nameField: '@',
                orNameField: '@',
                placeholder: '@',
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

                scope.refreshDelay = AEditConfig.select_options.refresh_delay;
                scope.resetSearchInput = AEditConfig.select_options.reset_search_input;

                scope.options = {
                    selected: scope.type == 'multiselect' ? [] : null,
                    search: ''
                };

                scope.full_type = scope.type = scope.type || 'select';
                if(scope.adder)
                    scope.full_type += '-adder';

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
                scope.selectedItemChange = function(){
                    $timeout(scope.onSelect);
                    $timeout(scope.ngChange);

                    if(scope.type == 'select')  {
                        scope.fakeModel =  scope.options.selected ?  scope.options.selected.id : null;
                    } else if(scope.type == 'multiselect'){
                        scope.fakeModel = scope.options.selected ?  scope.options.selected.map(function(item){return item.id;}) : [];
                    } else if(scope.type == 'textselect'){
                        scope.fakeModel = scope.options.selected;
                    }

                    scope.ngModel = scope.fakeModel;

                    //scope.options.search = '';

                    scope.getListByResource();
                };

                scope.$watch('ngModel', function(newVal){
                    if(scope.fakeModel == newVal)
                        return;

                    scope.fakeModel = newVal;

                    scope.setSelected();
                });

                //=============================================================
                // Init select list
                //=============================================================
                function initListGetByResource(){
                    if(!scope.ngResource || !scope.getList || (scope.local_list && scope.local_list.length))
                        return;

                    scope.getListByResource();
                }

                scope.getListByResource = function (query){
                    if(!scope.ngResource)
                        return;

                    var request_options = {};
                    if(scope.options.search)
                        request_options[variables['query']] = scope.options.search;
                    else
                        delete request_options[variables['query']];

                    request_options[variables['limit']] = AEditConfig.select_options.items_per_page;

                    if(scope.type == 'multiselect')
                        request_options[variables['id_not_in']] = scope.ngModel && scope.ngModel.length ? scope.ngModel.join(',') : [];

                    return AEditHelpers.getResourceQuery(scope.ngResource, 'get', request_options).then(function(list){
                        scope.local_list = list;

                        scope.setSelected();
                        return list;
                    });
                };

                scope.$watch('ngResource', initListGetByResource);
                scope.$watch('refreshListOn', initListGetByResource);

                //=============================================================
                // Output non edit mode
                //=============================================================
                scope.$watch('list', function(list){
                    scope.local_list = angular.copy(list);
                    scope.setSelected();
                });

                scope.setSelected = function(){
                    if(!scope.local_list || !scope.local_list.length)
                        return;

                    if(scope.type == 'textselect'){
                        scope.options.selected = scope.ngModel ? scope.ngModel : '';
                        return;
                    }

                    if(scope.type == 'multiselect' && scope.ngModel && scope.ngModel.length){
                        if(scope.options.selected && scope.options.selected.length && scope.fakeModel.length == scope.options.selected.length)
                            return;

                        scope.options.selected = [];

                        scope.ngModel.forEach(function(id, index){
                            var foundItem = null;
                            scope.local_list.some(function(item){
                                if(item.id == id)
                                    foundItem = item;

                                return item.id == id;
                            });

                            if(foundItem){
                                scope.options.selected[index] = foundItem;
                            } else {
                                getObjectFromServer(id).then(function(serverItem){
                                    scope.options.selected[index] = serverItem;
                                })
                            }
                        });
                    } else if(scope.type == 'select' && scope.ngModel)  {
                        if(scope.options.selected)
                            return;

                        var found = scope.local_list.some(function(item){
                            if(item.id == scope.ngModel)
                                scope.options.selected = item;

                            return item.id == scope.ngModel;
                        });
                        if(!found){
                            getObjectFromServer(scope.ngModel).then(function(serverItem){
                                scope.options.selected = serverItem;
                            })
                        }
                    }
                };

                function getObjectFromServer(id){
                    return AEditHelpers.getResourceQuery(scope.ngResource, 'show', {id: id});
                }
                scope.getNameFromObj = function(obj){
                    if(!obj)
                        return '';

                    if(scope.type == 'textselect')
                        return obj;

                    return obj[scope.nameField] || obj.name || obj[scope.orNameField];
                };

                scope.newItem = function(){
                    if(scope.type == 'textselect' || !scope.ngResourceFields || !scope.ngResourceFields.length)
                        scope.ngResourceFields = [{name: scope.nameField || 'name' || scope.orNameField, label: ''}];

                    var inputsHtml = '';
                    var data = { lists: {} };
                    scope.ngResourceFields.forEach(function(field){
                        if(field.name == scope.nameField || field.name == 'name' || field.name == scope.orNameField)
                            field.default_value = scope.options.search;

                        inputsHtml += '<div flex="grow" layout="row" layout-fill>' + AEditHelpers.generateDirectiveByConfig(field, {
                                            item_name: 'new_object',
                                            lists_container: 'lists',
                                            always_edit: true,
                                            get_list: true,
                                            is_new: true
                                            //already_modal: true
                                        }) + '</div>';

                        data.lists[field.list] = [];

                        if(field.resource){
                            data[field.name + '_resource'] = field.resource;
                        }

                        if(field.type == 'multiselect'){
                            data.new_object[field.name] = [];
                        }
                    });

                    var position = $mdPanel.newPanelPosition()
                        .relativeTo('#' + scope.id)
                        .addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.ABOVE);

                    $mdPanel.open({
                        clickOutsideToClose: false,
                        position: position,
                        focusOnOpen: false,
                        hasBackdrop: true,
                        bindToController: false,
                        panelClass: 'md-background md-hue-3',
                        locals: {
                            data: data
                        },
                        controller: ['$scope', 'mdPanelRef', 'data', function ($scope, mdPanelRef, data) {
                            angular.extend($scope, data);
                            $scope.save = function() {
                                mdPanelRef.save($scope.new_object);
                                mdPanelRef.hide();
                            };
                            $scope.cancel = function() {
                                mdPanelRef.hide();
                            };
                        }],
                        template: '' +
                        '<md-content layout="column">' +
                            '<md-toolbar class="md-primary"><div class="md-toolbar-tools"><h4>Create new</h4><span class="flex"></span><md-button class="md-icon-button" ng-click="cancel()"><md-icon>close</md-icon></md-button></div></md-toolbar>' +
                            '<md-content layout="row" class="padding" layout-wrap>' +
                                inputsHtml +
                            '</md-content>' +
                            '<md-content layout="row">' +
                                '<md-button ng-click="save()">Save</md-button>' +
                                '<md-button ng-click="cancel()">Cancel</md-button>' +
                            '</md-content>' +
                        '</md-content>'
                    }).then(function(mdPanelRef){
                        mdPanelRef.save = scope.saveToList;
                    });
                };

                //=============================================================
                // Add new item to select list by adder
                //=============================================================
                scope.saveToList = function(new_object){
                    if(scope.type == 'textselect'){
                        //get first property of object and add it to list
                        var is_first_prop = true;
                        angular.forEach(new_object, function(prop_value){
                            if(is_first_prop){
                                scope.local_list.unshift(prop_value);
                                scope.ngModel = prop_value;
                            }
                            is_first_prop = false;
                        });
                        return;
                    }

                    AEditHelpers.getResourceQuery(new scope.ngResource(new_object), 'create').then(function(object){
                        scope.options.search = '';

                        if(scope.type == 'multiselect')
                            scope.fakeModel.push(object.id);
                        else if(scope.type == 'select')
                            scope.fakeModel = object.id;

                        scope.ngModel = scope.fakeModel;

                        scope.setSelected();
                    });
                }
            }
        };
    }]);
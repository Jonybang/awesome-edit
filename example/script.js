// Code goes here
angular
  .module('app', ['a-edit', 'ngResource', 'example-backend'])
  
  .run(['AEditConfig', function(AEditConfig) {
      AEditConfig.templates_path = '../js/templates/';
  }])
  
  .controller('myController', ['$scope', '$timeout', '$resource', 'AEditConfig', function($scope, $timeout, $resource, AEditConfig) {
    
    var ItemResource = $resource('/api/items/:itemId', {itemId:'@id'});
    
    ItemResource.query(function(data){
        $scope.list = data;
    });
    
    $scope.aGridOptions = {
      caption: 'Enter - save, double click - edit.',
      orderBy: '-id',
      model: ItemResource,
      fields: [
        {
          name: 'id',
          label: '#',
          readonly: true
        },
        {
          name: 'name',
          modal: 'self',
          label: 'Название',
          new_placeholder: 'Новый объект'
        },
        {
          name: 'type_id',
          label: 'Тип',
          type: 'select',
          list: 'types'
        },
        {
          name: 'types_ids',
          label: 'Типы',
          type: 'multiselect',
          list: 'types'
        },
        {
          name: 'date',
          label: 'Дата',
          type: 'date'
        }
        
      ],
      lists: {
        types: [
          {id: 2, name: 'Дизайн'},
          {id: 3, name: 'Программирование'},
          {id: 4, name: 'Менеджмент'},
          {id: 5, name: 'Архитектура'},
          {id: 6, name: 'Электроника'}
        ]
      }
    };
    
  }])
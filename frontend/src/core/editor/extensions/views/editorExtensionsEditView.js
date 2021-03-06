// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require) {

  var Backbone = require('backbone');
  var Origin = require('coreJS/app/origin');
  var EditorOriginView = require('editorGlobal/views/editorOriginView');
  var EditorConfigModel = require('editorConfig/models/editorConfigModel');
  var ExtensionCollection = require('editorExtensions/collections/extensionCollection');
  var ExtensionModel = require('editorExtensions/models/extensionModel');

  var EditorExtensionsEditView = EditorOriginView.extend({

    tagName: "div",

    className: "extension-management",

    settings: {
      autoRender: false
    },

    events: {
      'click button.remove-extension' : 'onRemoveExtensionClicked',
      'click button.add-extension': 'onAddExtensionClicked'
    },

    preRender: function() {
        this.currentSelectedIds = [];
        this.listenTo(Origin, 'editorExtensionsEdit:views:add', this.addExtension);
        this.listenTo(Origin, 'editorExtensionsEdit:views:remove', this.removeExtension);
        this.setupExtensions();
    },

    setupExtensions: function() {

        // Grab available extensions
        var availableExtensionsCollection = Origin.editor.data.extensionTypes;

        // Get enabled extensions
        var enabledExtensions = Origin.editor.data.config.get('_enabledExtensions');

        // Pluck Ids so we can compare
        var enabledExtensionsIds = _.pluck(enabledExtensions, '_id');

        var enabledExtensionsCollection = new Backbone.Collection();
        var disabledExtensionsCollection = new Backbone.Collection();

        // Go through each collection and see if it's enabled
        // and push to correct collection
        availableExtensionsCollection.each(function(extension) {

            if (_.indexOf(enabledExtensionsIds, extension.get('_id')) > -1) {
                enabledExtensionsCollection.add(extension);
            } else {
                disabledExtensionsCollection.add(extension);
            }
        });

        // Set collections on model render for render
        this.model.set('enabledExtensions', enabledExtensionsCollection.toJSON());
        this.model.set('availableExtensions', disabledExtensionsCollection.toJSON());

        this.render();

        _.defer(_.bind(this.postRender, this));

    },

    postRender: function() {
        this.setViewToReady();
    },

    onAddExtensionClicked: function(event) {
        this.currentSelectedIds = [$(event.currentTarget).attr('data-id')];
        var extensionName = $(event.currentTarget).attr('data-displayname');

        Origin.Notify.confirm({
          title: window.polyglot.t('app.manageextensions'),
          text: window.polyglot.t('app.confirmapplyextension', {extension: extensionName}),
          html: true,
          closeOnConfirm: true,
          confirmButtonText: window.polyglot.t('app.ok'),
          cancelButtonText: window.polyglot.t('app.cancel'),
          callback: _.bind(this.onAddExtensionConfirmed, this)
        });
    },

    onAddExtensionConfirmed: function(confirmed) {
        if (confirmed) {
          Origin.trigger('editorExtensionsEdit:views:add');
        }
    },

    addExtension: function() {
        var self = this;

        $.post('/api/extension/enable/' + this.model.get('_id'), {
                extensions: this.currentSelectedIds
            }, _.bind(function(result) {
            if (result.success) {
                self.refreshData();
            } else {
                alert('An error occured');
            }
        }, this));
    },

    onRemoveExtensionClicked: function(event) {
        this.currentSelectedIds = [$(event.currentTarget).attr('data-id')];

        Origin.Notify.confirm({
          title: window.polyglot.t('app.manageextensions'),
          text: window.polyglot.t('app.confirmdeleteextension'),
          html: true,
          closeOnConfirm: true,
          confirmButtonText: window.polyglot.t('app.ok'),
          cancelButtonText: window.polyglot.t('app.cancel'),
          callback: _.bind(this.onRemoveExtensionConfirmed, this)
        });

    },

    onRemoveExtensionConfirmed: function(confirmed) {
        if (confirmed) {
            Origin.trigger('editorExtensionsEdit:views:remove');
        }
    },

    refreshData: function() {
      var self = this;

      var configModel = new EditorConfigModel({_courseId: this.model.get('_id')});
      // Ensure that the latest config model is always up-to-date when entering this screen
      configModel.fetch({
        success: function(model, response, options) {
          Origin.editor.data.config =  model;

          Origin.trigger('scaffold:updateSchemas', function() {
            self.setupExtensions();
          }, this);
        }
      });
    },

    removeExtension: function() {
        var self = this;

        $.post('/api/extension/disable/' + this.model.get('_id'), {
                extensions: this.currentSelectedIds
            }, _.bind(function(result) {
            if (result.success) {
                self.refreshData();
            } else {
                alert('An error occured');
            }
        }, this));
    }

  },
  {
    template: 'editorExtensionsEdit'
  });

  return EditorExtensionsEditView;

});

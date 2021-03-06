// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require){

  var Backbone = require('backbone');
  var OriginView = require('coreJS/app/views/originView');
  var Origin = require('coreJS/app/origin');
  var AssetModel = require('coreJS/assetManagement/models/assetModel');
  var TagsInput = require('core/libraries/jquery.tagsinput.min');

  var AssetManagementNewAssetView = OriginView.extend({


    className: 'asset-management-modal-new-asset',

    events: {
      'change .asset-file'          : 'onChangeFile',
      'click .asset-management-modal-new-asset-close': 'onCloseClicked',
      'click .asset-management-modal-new-asset-upload': 'onUploadClicked'
    },

    preRender: function() {
      this.listenTo(Origin, 'assetManagement:modal:newAssetOpened', this.remove);
      this.listenTo(Origin, 'assetManagement:newAsset', this.uploadAsset);
    },

    onCloseClicked: function(event) {
      event.preventDefault();
      this.remove();
    },

    onUploadClicked: function(event) {
      event.preventDefault();
      this.uploadAsset();
    },

    postRender: function() {
      // tagging

      $('#tags').tagsInput({
        autocomplete_url: '/api/autocomplete/tag',
        onAddTag: _.bind(this.onAddTag, this),
        onRemoveTag: _.bind(this.onRemoveTag, this)
      });
      // Set view to ready
      this.setViewToReady();
    },

    onChangeFile: function(event) {
      var $title = this.$('.asset-title');

      // Default 'title' -- remove C:\fakepath if it is added
      $title.val(this.$('.asset-file')[0].value.replace("C:\\fakepath\\", ""));
    },

    validateInput: function () {
      var reqs = this.$('.required');
      var uploadFile = this.$('.asset-file');
      var validated = true;
      var uploadFileErrormsg = $(uploadFile).prev('label').find('span.error');
      $.each(reqs, function (index, el) {
        var errormsg = $(el).prev('label').find('span.error');
        if (!$.trim($(el).val())) {
          validated = false;
          $(el).addClass('input-error');
          $(errormsg).text(window.polyglot.t('app.pleaseentervalue'));
        } else {
          $(el).removeClass('input-error');
          $(errormsg).text('');
        }
      });
      if (!uploadFile.val()) {
        validated = false;
        $(uploadFile).addClass('input-error');
        $(uploadFileErrormsg).text(window.polyglot.t('app.pleaseaddfile'));
      } else {
        $(uploadFile).removeClass('input-error');
        $(uploadFileErrormsg).text('');
      }
      return validated;
    },

    uploadAsset: function() {

      if (!this.validateInput()) {
        return false;
      }

      var title = this.$('.asset-title').val();
      var description = this.$('.asset-description').val();
        // If model is new then uploadFile
        if (this.model.isNew()) {
          this.uploadFile();
          // Return false to prevent the page submitting
          return false;
        } else {
          // Else just update the title, description and tags
          this.model.set({title: title, description: description});
          this.model.save(null, {
            error: function(model, response, options) {
              alert('Error updating asset');
            },
            success: _.bind(function(model, response, options) {
              Origin.trigger('assetManagement:collection:refresh', true);
              this.remove();
            }, this)
          })
        }

    },

    uploadFile: function() {
      // fix tags
      var tags = [];
      _.each(this.model.get('tags'), function (item) {
        item._id && tags.push(item._id);
      });
      this.$('#tags').val(tags);

      var self = this;
      this.$('.asset-form').ajaxSubmit({

        uploadProgress: function(event, position, total, percentComplete) {
          $(".progress-container").css("visibility", "visible");
          var percentVal = percentComplete + '%';
          $(".progress-bar").css("width", percentVal);
          $('.progress-percent').html(percentVal);
        },

        error: function(xhr, status, error) {
          // console.log('Error: ' + xhr.status);
        },

        success: function(data, status, xhr) {
          Origin.once('assetManagement:assetManagementCollection:fetched', function() {
            Origin.trigger('assetManagement:modal:selectItem', data._id);
          })
          Origin.trigger('assetManagement:collection:refresh', true);
          self.remove();
        }
      });

      // Return false to prevent the page submitting
      return false;
    },

    onAddTag: function (tag) {
      var model = this.model;
      $.ajax({
        url: '/api/content/tag',
        method: 'POST',
        data: { title: tag }
      }).done(function (data) {
        if (data && data._id) {
          var tags = model.get('tags') || [];
          tags.push({ _id: data._id, title: data.title });
          model.set({ tags: tags });
        }
      });
    },

    onRemoveTag: function (tag) {
      var tags = [];
      _.each(this.model.get('tags'), function (item) {
        if (item.title !== tag) {
          tags.push(item);
        }
      });
      this.model.set({ tags: tags });
    }

  }, {
    template: 'assetManagementModalNewAsset'
  });

  return AssetManagementNewAssetView;

});
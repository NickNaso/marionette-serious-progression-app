ContactManager.module("ContactsApp.List", function(List, ContactManager, Backbone, Marionette, $, _){
  var Controller = Marionette.Controller.extend({
    listContacts: function(options){
      var loadingView = new ContactManager.Common.Views.Loading();
      ContactManager.mainRegion.show(loadingView);

      var fetchingContacts = ContactManager.request("contact:entities", { parameters: options });

      var contactsListLayout = new List.Layout();
      var contactsListPanel = new List.Panel();

      var self = List.Controller;
      $.when(fetchingContacts).done(function(contacts){
        if(options.criterion){
          contactsListPanel.once("show", function(){
            contactsListPanel.triggerMethod("set:filter:criterion", options.criterion);
          });
        }

        var contactsListView = new ContactManager.Common.Views.PaginatedView({
          collection: contacts,
          mainView: List.Contacts,
          propagatedEvents: [
            "itemview:contact:show",
            "itemview:contact:edit",
            "itemview:contact:delete"
          ],
          paginatedUrlBase: "contacts/filter/"
        });

        self.listenTo(contactsListView, "page:change", function(){
          ContactManager.trigger("page:change", _.clone(contacts.parameters.attributes));
        });

        self.listenTo(contactsListPanel, "contacts:filter", function(filterCriterion){
          contacts.parameters.set({
            page: 1,
            criterion: filterCriterion
          });
          ContactManager.trigger("contacts:filter", _.clone(contacts.parameters.attributes));
        });

        self.listenTo(contactsListLayout, "show", function(){
          contactsListLayout.panelRegion.show(contactsListPanel);
          contactsListLayout.contactsRegion.show(contactsListView);
        });

        self.listenTo(contactsListPanel, "contact:new", function(){
          var newContact = new ContactManager.Entities.Contact();

          var view = new ContactManager.ContactsApp.New.Contact({
            model: newContact
          });

          self.listenTo(view, "form:submit", function(data){
            var savingContact = newContact.save(data);
            if(savingContact){
              $.when(savingContact).done(function(){
                contacts.add(newContact);
                view.trigger("dialog:close");
                var newContactView = contactsListView.children.findByModel(newContact);
                // check whether the new contact view is displayed (it could be
                // invisible due to the current filter criterion)
                if(newContactView){
                  newContactView.flash("success");
                }
              }).fail(function(response){
                view.onClose = function(){
                  newContact.set(newContact.previousAttributes());
                };

                if(response.status === 422){
                  view.triggerMethod("form:data:invalid", response.responseJSON.errors);
                }
                else{
                  alert("An unprocessed error happened. Please try again!");
                }
              });
            }
            else{
              view.triggerMethod("form:data:invalid", newContact.validationError);
            }
          });

          ContactManager.dialogRegion.show(view);
        });

        self.listenTo(contactsListView, "itemview:contact:show", function(childView, args){
          ContactManager.trigger("contact:show", args.model.get("id"));
        });

        self.listenTo(contactsListView, "itemview:contact:edit", function(childView, args){
          var model = args.model;
          var view = new ContactManager.ContactsApp.Edit.Contact({
            model: model
          });

          self.listenTo(view, "form:submit", function(data){
            model.set(data, {silent: true});
            var savingContact = model.save(data, {wait: true});
            if(savingContact){
              view.onBeforeClose = function(){
                model.set({changedOnServer: false});
              };
              $.when(savingContact).done(function(){
                childView.render();
                delete view.onClose;
                view.trigger("dialog:close");
                childView.flash("success");
              }).fail(function(response){
                if(response.status === 422){
                  view.onClose = function(){
                    model.set(response.responseJSON.entity);
                  };

                  var keys = ['firstName', 'lastName', 'phoneNumber'];
                  model.refresh(response.responseJSON.entity, keys);

                  view.render();
                  view.triggerMethod("form:data:invalid", response.responseJSON.errors);
                  model.set(response.responseJSON.entity, {silent:true});
                }
                else{
                  alert("An unprocessed error happened. Please try again!");
                }
              });
            }
            else{
              view.onClose = function(){
                model.set(model.previousAttributes());
              };

              view.triggerMethod("form:data:invalid", model.validationError);
            }
          });

          ContactManager.dialogRegion.show(view);
        });

        self.listenTo(contactsListView, "itemview:contact:delete", function(childView, args){
          args.model.destroy();
        });

        ContactManager.mainRegion.show(contactsListLayout);
      }).fail(function(){
        alert("An unprocessed error happened. Please try again!");
      });
    }
  });

  List.Controller = new Controller();
});

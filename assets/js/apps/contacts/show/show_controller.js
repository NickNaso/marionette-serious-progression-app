ContactManager.module("ContactsApp.Show", function(Show, ContactManager, Backbone, Marionette, $, _){
  var Controller = Marionette.Controller.extend({
    showContact: function(id){
      var loadingView = new ContactManager.Common.Views.Loading();
      ContactManager.regions.main.show(loadingView);

      var fetchingContact = ContactManager.request("contact:entity", id, {
        error: function(xhr, responseText, error){
          console.log("Some error happened (processed in error callback)");
        }
      });
      $.when(fetchingContact).done(function(contact){
        var acquaintances = contact.get("acquaintances");
        var strangers = contact.get("strangers");
        var acquaintancesUrl = _.result(contact, "url") + "/acquaintances/";
        contact.listenTo(acquaintances, "add", function(model){
          $.ajax({
            url: acquaintancesUrl + 'add/' + model.get("id"),
            type: "POST",
            dataType: "json",
            success: function(){
              contact.get("strangers").remove(model);
            }
          });
        });
        contact.listenTo(acquaintances, "remove", function(model){
          $.ajax({
            url: acquaintancesUrl + 'remove/' + model.get("id"),
            type: "DELETE",
            dataType: "json",
            success: function(){
              contact.get("strangers").add(model);
            }
          });
        });

        var acquaintancesFetched = contact.get("acquaintances").getFirstPage({ silent: true }),
            strangersFetched = contact.get("strangers").getFirstPage({ silent: true });
        $.when(acquaintancesFetched, strangersFetched).then(function(){
          var contactView = new Show.Contact({
            model: contact
          });

          Show.Controller.listenTo(contactView, "show", function(){
            var acquaintancesView = new ContactManager.Common.Views.PaginatedView({
              collection: acquaintances,
              mainView: Show.Acquaintances,
              propagatedEvents: ["childview:acquaintance:remove"]
            });
            contactView.listenTo(acquaintancesView, "page:change", function(page){
              acquaintances.parameters.set("page", page);
            });

            var strangersView = new ContactManager.Common.Views.PaginatedView({
              collection: strangers,
              mainView: Show.Strangers,
              propagatedEvents: ["childview:acquaintance:add"]
            });
            contactView.listenTo(strangersView, "page:change", function(page){
              strangers.parameters.set("page", page);
            });

            Show.Controller.listenTo(acquaintancesView, "childview:acquaintance:remove", function(view, args){
              contact.get("acquaintances").remove(args.model);
            });
            Show.Controller.listenTo(strangersView, "childview:acquaintance:add", function(view, args){
              contact.get("acquaintances").add(args.model);
            });

            contactView.acquaintancesRegion.show(acquaintancesView);
            contactView.strangersRegion.show(strangersView);
          });

          Show.Controller.listenTo(contactView, "contact:edit", function(contact){
            ContactManager.trigger("contact:edit", contact.get("id"));
          });

          ContactManager.regions.main.show(contactView);
        });
      }).fail(function(response){
        console.log("Some error happened (processed in deferred's fail callback)");
        if(response.status === 404){
          var contactView = new Show.MissingContact();
          ContactManager.regions.main.show(contactView);
        }
        else{
          alert("An unprocessed error happened. Please try again!");
        }
      });
    }
  });

  Show.Controller = new Controller();

  ContactManager.ContactsApp.on("stop", function(){
    Show.Controller.destroy();
  });
});

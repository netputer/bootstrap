define([
    'underscore'
], function(
    _
) {
'use strict';
return ['wdEventEmitter', '$rootScope', 'wdSocket', 'Photos',
function(wdEventEmitter,   $rootScope,   wdSocket,   Photos) {

var photos = {
    collection: [],
    getById: function(id) {
        return _.find(this.collection, function(p) {
            return p.id === id;
        });
    },
    merge: function(photos) {
        photos = [].concat(photos);
        photos = _.sortBy(this.collection.concat(photos), function(photo) {
            return 'date_added' in photo ? -photo.date_added : Number.NEGATIVE_INFINITY;
        });
        this.collection = _.uniq(photos, function(photo) {
            return photo.id;
        });
    },
    clear: function() {
        this.collection = [];
    }
};

wdEventEmitter(photos);

$rootScope.$on('signout', function() {
    photos.collection = [];
});

wdSocket.on('photos_add.wdp', function(e, message) {
    _(message.data).each(function(id) {
        var photo = photos.getById(id);
        if (!photo) {
            Photos.get({id: id}, function(p) {
                photos.merge(p);
                photos.trigger('add', [photos.getById(p.id)]);
            });
        }
    });
}).on('photos_remove.wdp', function(e, message) {
    _(message.data).each(function(id) {
        var photo = photos.getById(id);
        if (photo) {
            var index = photos.collection.indexOf(photo);
            photos.collection.splice(index, 1);
            photos.trigger('remove', [photo]);
        }
    });
});

return photos;

}];
});

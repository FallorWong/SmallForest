var assert = require('assert');
var randomName = require("chinese-random-name");

var Model = require('../model');
var Utils = require('../utils');

var User = Model.User;
var Room = Model.Room;
var Topic = Model.Topic;
var LabelTopic = Model.LabelTopic;

var UserService = module.exports;

UserService.getOwnedTopics = function(id) {

  return Topic
    .findAll({ where: { ownerId: id } });

};

UserService.getAppliedTopics = function(id) {
  return Room.findAll({
    where: {
      applierId: id
    }
  }).then(function (rooms) {
    if (!rooms || !rooms.length) {
      return [];
    }
    var topicIds = rooms.map(function (item) {
      return item.topicId
    });
    return Topic.findAll({ where: { id: topicIds } });
  });
};

UserService.postTopic = function(topic) {
  var labelIds = topic.labelIds;
  delete topic.labelIds;
  return Topic
    .create(topic)
    .then(function (result) {
      if (result && result.id) {
        var relations = labelIds.map(function (item) {
          return {
            labelId: item,
            topicId: result.id
          };
        });
        LabelTopic.bulkCreate(relations);
      }
      return result;
    });
};

UserService.random = function() {

  var user = {
    email: Utils.random(8) + '@smail.forest',
    password: Utils.random(16),
    name: randomName.generate()
  };

  return UserService.createUser(user.email, user.name, user.password);

};

UserService._login = function (user, md5Password) {

  if (!user) {
    return Promise.reject('user does not exist');
  } else if (user.password !== md5Password) {
    return Promise.reject('password is wrong');
  }

  return user;
};

UserService.login = function login(email, password) {
  assert(email, 'email param required!');
  assert(password, 'password param required!');

  var md5Password = Utils.md5(password);

  return User.findOne({
    where: {
      email: email,
    }
  }).then(function (user) {
    return UserService._login(user, md5Password);
  });

};

UserService.createUser = function createUser(email, name, password) {
  assert(name, 'name param required!');
  assert(email, 'email param required!');
  assert(password, 'password param required!');
  var md5Password = Utils.md5(password);

  var newUser = {};
  newUser.name = name;
  newUser.email = email;
  newUser.password = md5Password;

  return User.findOne({
    where: { email: email }
  }).then(function (user) {
    if (user) {
      return Promise.reject((user.email === email ? 'email' : 'mobile') + ' exists');
    } else {
      return User.create(newUser);
    }
  });
};

UserService.getUser = function getUser(id) {
  assert(id, 'id param required!');

  return User.findOne({
    where: {
      id: id
    },
    include: [
      {
        model: Model.Profile,
        as: 'profile'
      }
    ]
  });
};

UserService.getUserByEmail = function getUserByEmail(email) {
  assert(email, 'email param required!');

  return User.findOne({
    attributes: [ 'email', 'mobile' ],
    where: { email: email }
  });
};

UserService.updateUser = function updateUser(id, body) {
  assert(id, 'id param required!');
  assert(body, 'body param required!');

  var name = body.name;
  var newPassword = body.newPassword;
  var originalPassword = body.originalPassword;

  return User.findOne({ where: { id: id } })
  .then(function (user) {
    var update = false;

    if (name && name !== user.name) {
      user.name = name;
      update = true;
    }
    if (newPassword &&
     originalPassword &&
     originalPassword === user.password) {
      user.password = newPassword;
      update = true;
    }

    if (update) {
      user.updatedDate = new Date();
    }

    return user.save();
  }).then(function () {
    return true;
  });
};

UserService.resetPassword = function resetPassword(email, mobile, newPassword) {
  assert(email, 'email param required!');
  assert(mobile, 'mobile param required!');
  assert(newPassword, 'newPassword param required!');

  return User.findOne({ where: { email: email } })
  .then(function (user) {
    var update = false;

    if (newPassword && mobile === user.mobile) {
      user.password = Utils.md5(newPassword);
      update = true;
    }

    if (update) {
      user.updatedDate = new Date();
    }

    return user.save();
  }).then(function () {
    return true;
  });
};

UserService.checkEmail = function (email) {
  assert(email, 'Email required when check email.');

  return User.findOne({
    attributes: [ 'id' ],
    where: { email: email }
  });
};

UserService.checkMobile = function (mobile) {
  assert(mobile, 'Mobile required when check mobile.');

  return User.findOne({
    attributes: [ 'id' ],
    where: { mobile: mobile }
  });
};

const config = require('../config.json');

function hasPermission(userRank, permission) {
  if (!config.ranks[userRank]) {
    userRank = 'default';
  }

  const rankPermissions = config.ranks[userRank].permissions;

  if (rankPermissions.includes('all')) {
    return true;
  }

  return rankPermissions.includes(permission);
}

function getRankName(userRank) {
  if (!config.ranks[userRank]) {
    return config.ranks.default.name;
  }
  return config.ranks[userRank].name;
}

function getRankPermissions(userRank) {
  if (!config.ranks[userRank]) {
    return config.ranks.default.permissions;
  }
  return config.ranks[userRank].permissions;
}

function canAccessChest(userRank, chestRank) {
  const rankHierarchy = ['default', 'normal', 'member', 'vip', 'admin'];
  const userRankIndex = rankHierarchy.indexOf(userRank);
  const chestRankIndex = rankHierarchy.indexOf(chestRank);

  return userRankIndex >= chestRankIndex;
}

module.exports = {
  hasPermission,
  getRankName,
  getRankPermissions,
  canAccessChest
};

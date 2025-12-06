const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'bot.db');
const db = new sqlite3.Database(dbPath);

function initialize() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        phone TEXT PRIMARY KEY,
        money INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        rank TEXT DEFAULT 'normal',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_work DATETIME,
        last_crime DATETIME
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        item_name TEXT NOT NULL,
        item_type TEXT NOT NULL,
        rarity TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        is_fused INTEGER DEFAULT 0,
        fused_type TEXT,
        FOREIGN KEY (phone) REFERENCES users(phone)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS chests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        price INTEGER NOT NULL,
        rank_required TEXT NOT NULL,
        description TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS shop_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        price INTEGER NOT NULL,
        type TEXT NOT NULL,
        rarity TEXT NOT NULL,
        rank_required TEXT NOT NULL,
        description TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS coupons (
        code TEXT PRIMARY KEY,
        amount INTEGER NOT NULL,
        used_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_phone TEXT NOT NULL,
        to_phone TEXT NOT NULL,
        from_money INTEGER DEFAULT 0,
        to_money INTEGER DEFAULT 0,
        from_items TEXT,
        to_items TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_phone) REFERENCES users(phone),
        FOREIGN KEY (to_phone) REFERENCES users(phone)
      )
    `);

    const chests = [
      { name: 'Normal', price: 2500, rank: 'normal', desc: 'Cofre básico con items comunes' },
      { name: 'Miembro', price: 5000, rank: 'member', desc: 'Cofre mejorado con items raros' },
      { name: 'Ultra VIP', price: 15000, rank: 'vip', desc: 'Cofre premium con cupones especiales' }
    ];

    chests.forEach(chest => {
      db.run(
        'INSERT OR IGNORE INTO chests (name, price, rank_required, description) VALUES (?, ?, ?, ?)',
        [chest.name, chest.price, chest.rank, chest.desc]
      );
    });

    console.log('✅ Base de datos inicializada');
  });
}

function registerUser(phone) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR IGNORE INTO users (phone) VALUES (?)',
      [phone],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

function getUser(phone) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function updateMoney(phone, amount) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET money = money + ? WHERE phone = ?',
      [amount, phone],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

function setMoney(phone, amount) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET money = ? WHERE phone = ?',
      [amount, phone],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

function updateExperience(phone, exp) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET experience = experience + ? WHERE phone = ?',
      [exp, phone],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

function updateLevel(phone, level) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET level = ?, experience = 0 WHERE phone = ?',
      [level, phone],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

function updateWorkCooldown(phone) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET last_work = CURRENT_TIMESTAMP WHERE phone = ?',
      [phone],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

function updateCrimeCooldown(phone) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET last_crime = CURRENT_TIMESTAMP WHERE phone = ?',
      [phone],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

function updateRank(phone, rank) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET rank = ? WHERE phone = ?',
      [rank, phone],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

function addItem(phone, itemName, itemType, rarity, quantity = 1, isFused = 0, fusedType = null) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM inventory WHERE phone = ? AND item_name = ? AND is_fused = ? AND fused_type = ?',
      [phone, itemName, isFused, fusedType],
      (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          db.run(
            'UPDATE inventory SET quantity = quantity + ? WHERE id = ?',
            [quantity, row.id],
            function(err) {
              if (err) reject(err);
              else resolve(true);
            }
          );
        } else {
          db.run(
            'INSERT INTO inventory (phone, item_name, item_type, rarity, quantity, is_fused, fused_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [phone, itemName, itemType, rarity, quantity, isFused, fusedType],
            function(err) {
              if (err) reject(err);
              else resolve(true);
            }
          );
        }
      }
    );
  });
}

function getInventory(phone) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM inventory WHERE phone = ? ORDER BY rarity DESC, item_name ASC',
      [phone],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

function removeItem(phone, itemName, quantity = 1, isFused = 0, fusedType = null) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM inventory WHERE phone = ? AND item_name = ? AND is_fused = ? AND (fused_type = ? OR fused_type IS NULL)',
      [phone, itemName, isFused, fusedType],
      (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(false);
        } else if (row.quantity > quantity) {
          db.run(
            'UPDATE inventory SET quantity = quantity - ? WHERE id = ?',
            [quantity, row.id],
            function(err) {
              if (err) reject(err);
              else resolve(true);
            }
          );
        } else {
          db.run(
            'DELETE FROM inventory WHERE id = ?',
            [row.id],
            function(err) {
              if (err) reject(err);
              else resolve(true);
            }
          );
        }
      }
    );
  });
}

function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM users ORDER BY money DESC LIMIT 10',
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

function createCoupon(code, amount) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO coupons (code, amount) VALUES (?, ?)',
      [code, amount],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

function getCoupon(code) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM coupons WHERE code = ?',
      [code],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function useCoupon(code, phone) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE coupons SET used_by = ?, used_at = CURRENT_TIMESTAMP WHERE code = ? AND used_by IS NULL',
      [phone, code],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

function createTrade(fromPhone, toPhone) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM trades WHERE (from_phone = ? OR to_phone = ?) AND status = "pending"',
      [fromPhone, fromPhone],
      () => {
        db.run(
          'INSERT INTO trades (from_phone, to_phone) VALUES (?, ?)',
          [fromPhone, toPhone],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      }
    );
  });
}

function getActiveTrade(phone) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM trades WHERE (from_phone = ? OR to_phone = ?) AND status = "pending"',
      [phone, phone],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function updateTrade(id, fromMoney, toMoney, fromItems, toItems) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE trades SET from_money = ?, to_money = ?, from_items = ?, to_items = ? WHERE id = ?',
      [fromMoney, toMoney, fromItems, toItems, id],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

function completeTrade(id) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE trades SET status = "completed" WHERE id = ?',
      [id],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

function cancelTrade(phone) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM trades WHERE (from_phone = ? OR to_phone = ?) AND status = "pending"',
      [phone, phone],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

function getChests() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM chests', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function getShopItems() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM shop_items', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = {
  initialize,
  registerUser,
  getUser,
  updateMoney,
  setMoney,
  updateExperience,
  updateLevel,
  updateWorkCooldown,
  updateCrimeCooldown,
  updateRank,
  addItem,
  getInventory,
  removeItem,
  getAllUsers,
  createCoupon,
  getCoupon,
  useCoupon,
  createTrade,
  getActiveTrade,
  updateTrade,
  completeTrade,
  cancelTrade,
  getChests,
  getShopItems
};

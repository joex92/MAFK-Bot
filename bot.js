/**
 * This bot example shows the basic usage of the mineflayer-pvp plugin for guarding a defined area from nearby mobs.
 */

const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin

function initBot() {
  const bot = mineflayer.createBot({
    host: process.env['host'],
    port: parseInt(process.env['port']),
    auth: 'microsoft',
    username: process.env['email'],
    //username: process.env['username'],
  })

  bot.loadPlugin(pathfinder)
  bot.loadPlugin(pvp)

  let guardPos = null
  let spawned = false;
  let logged = false;

  bot.on('kicked', (reason, loggedIn) => {
    console.log('reason', reason)
    if (loggedIn) {
      if (reason.text && reason.text.match(/[Kk][Ii][Cc][Kk]/)) {
        bot.end()
        bot.quit()
        proccess.exit()
        return
      }
    }
    //setTimeout(() => initBot(), 5000)
  })
  bot.on('error', console.error)
  bot.on('death', (d) => {
    console.log('death', d);
    //bot.end()
  })
  bot.on('end', () => setTimeout(() => initBot(), 5000))
  bot.on('respawn', () => guardArea(bot.player.entity.position))
  // Assign the given location to be guarded
  function guardArea(pos) {
    guardPos = pos
  }

  // Cancel all pathfinder and combat
  function stopGuarding() {
    guardPos = null
    bot.pvp.stop()
    bot.pathfinder.setGoal(null)
  }

  // Pathfinder to the guard position
  function moveToGuardPos() {
    bot.pathfinder.setMovements(new Movements(bot))
    bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z))
  }

  bot.on("resourcePack", (url, hash) => {
    console.log(url, hash)
    bot.denyResourcePack()
  })

  bot.on('spawn', () => {
    if (!spawned) {
      guardArea(bot.player.entity.position)
      setTimeout(() => bot.chat("beep boop beep boop"), 1000)
    }
    spawned = true;
  })

  // Called when the bot has killed it's target.
  bot.on('stoppedAttacking', () => {
    if (guardPos) {
      moveToGuardPos()
    }
  })

  // Check for new enemies to attack
  bot.on('physicsTick', () => {
    if (spawned && !bot.pvp.target && (guardPos != bot.player.entity.position)) {
      bot.stopDigging()
      moveToGuardPos()
    }
    const nearest = bot.nearestEntity()
    if (nearest) {
      bot.lookAt(nearest.position.offset(0, nearest.height, 0))
    }
    // Only look for mobs within 4 blocks
    const filter = e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 4 && e.mobType !== 'Armor Stand' // Mojang classifies armor stands as mobs for some reason?

    const entity = bot.nearestEntity(filter)
    if (entity) {
      // Start attacking
      bot.pvp.attack(entity)
    }
  })

  // Listen for player commands
  bot.on('chat', (username, message) => {
    /* Guard the location the player is standing
    if (message === 'guard') {
      const player = bot.players[username]
  
      if (!player) {
        bot.chat("I can't see you.")
        return
      }
  
      bot.chat('I will guard that location.')
      guardArea(player.entity.position)
    }
  
    // Stop guarding
    if (message === 'stop') {
      bot.chat('I will no longer guard this area.')
      stopGuarding()
    } */
    if (message.match(bot.player.username)) {
      bot.chat(`hey ${username}, I'm AFK. Mention me on Discord.`)
    }
    if (message.match(/[Ww][Bb]/)) {
      bot.chat(`hey! thanks, I'll be AFK for a moment.`)
    }
  })
}

initBot()
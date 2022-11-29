const fs = require('fs')
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin

function obj2str(obj) {
  return JSON.stringify(obj).replaceAll('[', '[\t').replaceAll(']', '\t]').replaceAll('{', '{\n\t').replaceAll('}', '\n}\n').replaceAll(':', ': ').replaceAll(',', ',\t').replaceAll('\n,', ',')
}

function logMsg(msg) {
  const date = new Date(Date.now()).toJSON().split(/[TZ]/)
  fs.appendFileSync(`logs/${date[0]}.log`, `[${date[1]}] ${msg.toString()}\n`, 'utf-8')
}

function initBot() {
  let hp = 20
  const bot = mineflayer.createBot({
    host: process.env['host'],
    port: parseInt(process.env['port']),
    auth: 'microsoft',
    username: process.env['email'],
    //username: process.env['username'],
    //password: process.env['password']
  })

  bot.on('error', (err) => {
    console.error(err)
    let e = ''
    Object.keys(err).forEach((v, i, a) => { e += `\t${v}: ${err[v]}\n` })
    logs.push(`Error:\n${e}`)
    logMsg(logs[logs.length - 1])
  })
  bot.on('login', console.log)

  bot.loadPlugin(pathfinder)
  bot.loadPlugin(pvp)

  let guardPos = null
  let spawned = false
  let afk = false
  let logs = []

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

  function stopBot() {
    bot.end()
    bot.quit()
    logMsg(logs[logs.length - 1])
    logMsg('Stopping...')
    proccess.exit()
  }

  bot.on('kicked', (reason, loggedIn) => {
    console.log('reason', reason)
    let r = ''
    Object.keys(reason).forEach((v, i, a) => { r += `\t${v}: ${reason[v]}\n` })
    logs.push('Kicked:\n' + r)
    if (loggedIn) {
      if (r.match(/[Kk][Ii][Cc][Kk]/)) {
        stopBot()
        return
      }
    }
    //setTimeout(() => initBot(), 5000)
  })
  bot.on('death', (d) => {
    console.log('death', d);
    logs.push('Death:\t' + obj2str(bot.player.entity.position))
    stopBot()
  })
  bot.on('end', () => setTimeout(() => initBot(), 5000))
  bot.on('respawn', () => guardArea(bot.player.entity.position))

  bot.on("resourcePack", (url, hash) => {
    console.log(url, hash)
    bot.denyResourcePack()
  })

  bot.on('spawn', () => {
    if (!spawned) {
      guardArea(bot.player.entity.position)
      setTimeout(() => bot.chat("hi, I'm _AFKing_ :upside_down:"), 500)
    }
    spawned = true;
    setTimeout(() => afk = true, 5000)
    console.log(bot.player)
  })

  // Called when the bot has killed it's target.
  bot.on('stoppedAttacking', () => {
    if (guardPos) {
      moveToGuardPos()
    }
  })

  // Check for new enemies to attack
  bot.on('physicsTick', () => {
    hp = bot.player != undefined ? bot.player.entity.metadata[9] : 20
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
  bot.on("messagestr", (message, messagePosition, jsonMsg, username, verified) => {
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
    console.log(message, obj2str(jsonMsg), `Health: ${hp}`)
    logs.push(`${jsonMsg.translate ? jsonMsg.translate : 'message'}: ${message}`)
    logMsg(logs[logs.length - 1])
    if (spawned && username) {
      if (message.match(bot.player.username)) {
        bot.chat(`hey ${username}, I'm AFK. Mention me on Discord.`)
      }
      if (message.match(/[Ww][Bb]/)) {
        if (!afk) {
          bot.chat(`hey ${username}! thanks, I'll be AFK for a while.`)
        }
      }
      if (message.match(/[Jj][Oo][Ii][Nn][Ee][Dd]/)) {
        bot.chat(`wb ${username}!`)
      }
    }
    if (hp < 10) {
      stopBot()
    }
  })
}
logMsg('')
logMsg('Starting...')
initBot()
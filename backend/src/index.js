import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

app.get('/api/matches', async (_req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const now = new Date();
    const in4Hours = new Date(now.getTime() + 4 * 3600 * 1000);

    const liveMatches = await prisma.match.findMany({
      where: { status: 'LIVE' },
      include: {
        homeTeam:   { select: { id: true, name: true, logo: true, strengthScore: true } },
        awayTeam:   { select: { id: true, name: true, logo: true, strengthScore: true } },
        league:     { select: { id: true, name: true, country: true, logo: true } },
        prediction: true,
        signals:    { where: { isActive: true } },
        liveStats:  { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
      orderBy: { kickoff: 'asc' },
    });

    const upcomingMatches = await prisma.match.findMany({
      where: {
        status: 'SCHEDULED',
        kickoff: { gte: now, lte: in4Hours },
      },
      include: {
        homeTeam:   { select: { id: true, name: true, logo: true, strengthScore: true } },
        awayTeam:   { select: { id: true, name: true, logo: true, strengthScore: true } },
        league:     { select: { id: true, name: true, country: true, logo: true } },
        prediction: true,
        signals:    { where: { isActive: true } },
      },
      orderBy: { kickoff: 'asc' },
      take: 20,
    });

    const matches = [...liveMatches, ...upcomingMatches];
    await prisma.$disconnect();
    res.json(matches);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/matches/:id', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: {
        homeTeam: true, awayTeam: true, league: true, prediction: true,
        signals: { where: { isActive: true } },
        odds: { orderBy: { recordedAt: 'desc' } },
        liveStats: { orderBy: { recordedAt: 'desc' }, take: 1 },
        events: { orderBy: { minute: 'asc' } },
      },
    });
    await prisma.$disconnect();
    if (!match) return res.status(404).json({ error: 'Not found' });
    res.json(match);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/predictions', async (_req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    const preds = await prisma.prediction.findMany({
      where: {
        match: {
          OR: [
            { status: 'LIVE' },
            { status: 'SCHEDULED', kickoff: { gte: now, lte: in7Days } },
          ],
        },
      },
      include: {
        match: {
          include: {
            homeTeam: { select: { name: true, logo: true } },
            awayTeam: { select: { name: true, logo: true } },
            league:   { select: { name: true, country: true } },
          },
        },
      },
      orderBy: { match: { kickoff: 'asc' } },
      take: 50,
    });

    if (preds.length === 0) {
      const allPreds = await prisma.prediction.findMany({
        include: {
          match: {
            include: {
              homeTeam: { select: { name: true, logo: true } },
              awayTeam: { select: { name: true, logo: true } },
              league:   { select: { name: true, country: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });
      await prisma.$disconnect();
      return res.json(allPreds);
    }

    await prisma.$disconnect();
    res.json(preds);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/signals', async (_req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const signals = await prisma.signal.findMany({
      where: { isActive: true },
      include: {
        match: {
          include: {
            homeTeam: { select: { name: true, logo: true } },
            awayTeam: { select: { name: true, logo: true } },
            league:   { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    await prisma.$disconnect();
    res.json(signals);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/live', async (_req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const matches = await prisma.match.findMany({
      where: { status: 'LIVE' },
      include: {
        homeTeam:  { select: { name: true, logo: true } },
        awayTeam:  { select: { name: true, logo: true } },
        league:    { select: { name: true, logo: true } },
        liveStats: { orderBy: { recordedAt: 'desc' }, take: 1 },
        events:    { orderBy: { minute: 'asc' } },
      },
    });
    await prisma.$disconnect();
    res.json(matches);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/odds/:matchId', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const odds = await prisma.odd.findMany({
      where: { matchId: req.params.matchId },
      orderBy: { recordedAt: 'desc' },
    });
    await prisma.$disconnect();
    res.json(odds);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/stats/backtest', async (_req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const signals = await prisma.signal.findMany({ where: { result: { not: null } } });
    const total = signals.length;
    const wins  = signals.filter((s: any) => s.result === 'WIN').length;
    await prisma.$disconnect();
    res.json({ total, wins, accuracy: total > 0 ? ((wins / total) * 100).toFixed(1) : '0' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/teams', async (_req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } });
    await prisma.$disconnect();
    res.json(teams);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/telegram-logs', async (_req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const logs = await prisma.telegramLog.findMany({ orderBy: { sentAt: 'desc' }, take: 50 });
    await prisma.$disconnect();
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  setTimeout(() => {
    if (process.env.TELEGRAM_BOT_TOKEN) startTelegramPoll();
  }, 5000);
});

async function startTelegramPoll() {
  const axios = require('axios');
  const BASE  = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  let offset  = 0;
  const poll = async () => {
    try {
      const { data } = await axios.get(`${BASE}/getUpdates`, {
        params: { offset, timeout: 30 }, timeout: 35000,
      });
      for (const u of (data.result || [])) {
        offset = u.update_id + 1;
        if (u.message?.text?.startsWith('/')) {
          handleTelegramCmd(u.message.text.split(' ')[0], String(u.message.chat.id), BASE, axios);
        }
      }
    } catch (_e) {}
    setTimeout(poll, 2000);
  };
  poll();
}

async function handleTelegramCmd(cmd: string, chatId: string, BASE: string, axios: any) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const send = (text: string) =>
    axios.post(`${BASE}/sendMessage`, { chat_id: chatId, text, parse_mode: 'HTML' }).catch(() => {});
  try {
    const now      = new Date();
    const in4Hours = new Date(now.getTime() + 4 * 3600 * 1000);
    switch (cmd) {
      case '/today':
      case '/upcoming': {
        const matches = await prisma.match.findMany({
          where: { status: 'SCHEDULED', kickoff: { gte: now, lte: in4Hours } },
          include: {
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
            league:   { select: { name: true } },
          },
          orderBy: { kickoff: 'asc' },
          take: 10,
        });
        if (!matches.length) { await send('No matches starting in next 4 hours.'); break; }
        const lines = matches.map((m: any) =>
          `• ${new Date(m.kickoff).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})} | ${m.homeTeam.name} vs ${m.awayTeam.name}`
        );
        await send(`📅 <b>Next 4 Hours</b>\n\n${lines.join('\n')}`);
        break;
      }
      case '/live': {
        const matches = await prisma.match.findMany({
          where: { status: 'LIVE' },
          include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
        });
        if (!matches.length) { await send('No live matches right now.'); break; }
        const lines = matches.map((m: any) =>
          `⚽ ${m.homeTeam.name} ${m.homeScore ?? 0} - ${m.awayScore ?? 0} ${m.awayTeam.name} (${m.minute}')`
        );
        await send(`🔴 <b>Live Matches</b>\n\n${lines.join('\n')}`);
        break;
      }
      case '/signals': {
        const signals = await prisma.signal.findMany({
          where: { isActive: true },
          include: {
            match: {
              include: {
                homeTeam: { select: { name: true } },
                awayTeam: { select: { name: true } },
              },
            },
          },
          orderBy: { confidence: 'desc' },
          take: 10,
        });
        if (!signals.length) { await send('No active signals.'); break; }
        const lines = signals.map((s: any) =>
          `• ${s.match.homeTeam.name} vs ${s.match.awayTeam.name}\n  ${s.type.replace(/_/g,' ')} | ${s.probability.toFixed(0)}% | ${s.confidence.toFixed(0)}% conf | ${s.risk}`
        );
        await send(`🎯 <b>Active Signals</b>\n\n${lines.join('\n\n')}`);
        break;
      }
      case '/stats': {
        const total    = await prisma.match.count();
        const live     = await prisma.match.count({ where: { status: 'LIVE' } });
        const upcoming = await prisma.match.count({ where: { status: 'SCHEDULED', kickoff: { gte: now, lte: in4Hours } } });
        const preds    = await prisma.prediction.count();
        const sigs     = await prisma.signal.count({ where: { isActive: true } });
        await send(`📊 <b>Platform Stats</b>\n\nTotal Matches: ${total}\nLive Now: ${live}\nNext 4 Hours: ${upcoming}\nPredictions: ${preds}\nActive Signals: ${sigs}`);
        break;
      }
      default:
        await send('Commands:\n/upcoming - Next 4 hours\n/live - Live now\n/signals - Active signals\n/stats - Platform stats');
    }
  } catch (_e) {} finally {
    await prisma.$disconnect();
  }
}

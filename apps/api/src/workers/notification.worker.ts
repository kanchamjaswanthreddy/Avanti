// Avanti API — Notification Worker
// Processes NotificationJobData from the 'notifications' BullMQ queue.
// Dispatches push (FCM/APNs), SMS (Twilio), WhatsApp (Gupshup), email (SMTP).

import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES, redisConnectionFromEnv } from '@avanti/queue';
import type { NotificationJobData, NotificationChannel } from '@avanti/queue';

// ── Channel senders ───────────────────────────────────────────────────────────

async function sendPush(data: NotificationJobData): Promise<void> {
  // TODO: Integrate FCM (Android) + APNs (iOS) via firebase-admin
  console.info(`[push] → ${data.recipientId}: ${data.title}`);
}

async function sendSms(data: NotificationJobData): Promise<void> {
  // TODO: Integrate Twilio
  console.info(`[sms] → ${data.recipientId}: ${data.body}`);
}

async function sendWhatsApp(data: NotificationJobData): Promise<void> {
  // TODO: Integrate Gupshup / Meta Cloud API
  console.info(`[whatsapp] → ${data.recipientId}: ${data.body}`);
}

async function sendEmail(data: NotificationJobData): Promise<void> {
  // TODO: Integrate nodemailer with school SMTP settings
  console.info(`[email] → ${data.recipientId}: ${data.title}`);
}

const SENDERS: Record<NotificationChannel, (d: NotificationJobData) => Promise<void>> = {
  push:      sendPush,
  sms:       sendSms,
  whatsapp:  sendWhatsApp,
  email:     sendEmail,
};

// ── Main processor ────────────────────────────────────────────────────────────

async function processNotification(job: Job<NotificationJobData>): Promise<void> {
  const { channel, recipientId, schoolId } = job.data;

  const sender = SENDERS[channel];
  if (!sender) throw new Error(`Unknown notification channel: ${channel}`);

  job.log(`Sending ${channel} notification to ${recipientId} (school: ${schoolId})`);
  await sender(job.data);
  await job.updateProgress(100);
}

// ── Worker factory ────────────────────────────────────────────────────────────

export function startNotificationWorker(): Worker<NotificationJobData> {
  const connection = redisConnectionFromEnv();

  const worker = new Worker<NotificationJobData>(
    QUEUE_NAMES.NOTIFICATIONS,
    processNotification,
    {
      connection,
      concurrency: 10,  // notifications are I/O bound — high concurrency
    }
  );

  worker.on('completed', (job) => {
    console.info(`[notification-worker] ${job.data.channel} → ${job.data.recipientId}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[notification-worker] Job ${job?.id} failed (${job?.data.channel}):`, err.message);
  });

  return worker;
}

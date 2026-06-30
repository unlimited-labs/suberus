import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`Generated VAPID keypair. Add these to your .env (and the prod env):

VITE_VAPID_PUBLIC_KEY="${publicKey}"
VAPID_PRIVATE_KEY="${privateKey}"
VAPID_SUBJECT="mailto:contact@your-conference.org"

VITE_VAPID_PUBLIC_KEY is the public key (read by both client and server);
the private key must stay server-side only. Set VAPID_SUBJECT to a mailto:
or https URL identifying the conference contact.`);

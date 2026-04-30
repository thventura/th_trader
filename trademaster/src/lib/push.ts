// VAPID public key
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await savePushSubscription(existing);
      return existing;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('[push] VITE_VAPID_PUBLIC_KEY não configurada — push desativado.');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
    });

    // Save subscription to backend (Supabase)
    await savePushSubscription(subscription);

    console.log('Push subscription criada:', subscription.endpoint);
    return subscription;
  } catch (err) {
    console.error('Erro ao criar push subscription:', err);
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
  } catch (err) {
    console.error('Erro ao cancelar push subscription:', err);
  }
}

async function savePushSubscription(subscription: PushSubscription) {
  const { supabase } = await import('./supabase');
  const userRes = await supabase.auth.getUser();
  if (!userRes.data.user) return;

  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: subscription.endpoint,
    keys: subscription.toJSON().keys,
    user_id: userRes.data.user.id,
  }, { onConflict: 'endpoint' });

  if (error) {
    console.error("Erro ao salvar inscrição no Supabase:", error);
  }
}

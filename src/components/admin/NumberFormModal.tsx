import { useEffect, useState, type FormEvent } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { generateVerifyToken } from '@/lib/utils';
import { WEBHOOK_URL } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { WhatsAppNumber } from '@/lib/database.types';
import { useToast } from '@/contexts/ToastContext';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (n: WhatsAppNumber) => void;
  initial?: WhatsAppNumber | null;
}

export function NumberFormModal({ open, onClose, onSaved, initial }: Props) {
  const toast = useToast();
  const isEdit = !!initial;
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [copied, setCopied] = useState<'token' | 'url' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDisplayName(initial.display_name);
      setPhone(initial.phone_number);
      setPhoneNumberId(initial.phone_number_id);
      setAccessToken(initial.access_token);
      setWabaId(initial.waba_id);
      setVerifyToken(initial.webhook_verify_token);
    } else {
      setDisplayName('');
      setPhone('');
      setPhoneNumberId('');
      setAccessToken('');
      setWabaId('');
      setVerifyToken(generateVerifyToken());
    }
  }, [open, initial]);

  async function copy(text: string, kind: 'token' | 'url') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      display_name: displayName.trim(),
      phone_number: phone.trim(),
      phone_number_id: phoneNumberId.trim(),
      access_token: accessToken.trim(),
      waba_id: wabaId.trim(),
      webhook_verify_token: verifyToken.trim(),
    };
    const { data, error } = isEdit
      ? await supabase
          .from('whatsapp_numbers')
          .update(payload)
          .eq('id', initial!.id)
          .select()
          .single()
      : await supabase.from('whatsapp_numbers').insert(payload).select().single();

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isEdit ? 'Number updated' : 'Number added');
    onSaved(data!);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit WhatsApp Number' : 'Add WhatsApp Number'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button form="number-form" type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Add number'}
          </Button>
        </>
      }
    >
      <form id="number-form" onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Input
            label="Display Name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Support Line"
          />
        </div>
        <Input
          label="Phone Number"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+15551234567"
          hint="Include country code"
        />
        <Input
          label="Phone Number ID"
          required
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          placeholder="From Meta Developer Dashboard"
          hint="From Meta Developer Dashboard"
        />
        <Input
          label="Access Token"
          required
          type="password"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          hint="Generate permanent token from Meta"
        />
        <Input
          label="WABA ID"
          required
          value={wabaId}
          onChange={(e) => setWabaId(e.target.value)}
          hint="WhatsApp Business Account ID"
        />
        <div className="md:col-span-2">
          <Input
            label="Webhook Verify Token"
            value={verifyToken}
            readOnly
            rightSlot={
              <button
                type="button"
                onClick={() => copy(verifyToken, 'token')}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Copy verify token"
              >
                {copied === 'token' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            }
            hint="Auto-generated. Paste this into Meta when subscribing the webhook."
          />
        </div>

        <div className="md:col-span-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-wa-teal">Setup instructions</h3>
            <a
              href="/setup-guide"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-wa-teal hover:underline"
            >
              Full guide <ExternalLink size={11} />
            </a>
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-xs text-gray-700">
            <li>Go to <a className="text-wa-teal underline" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com/apps</a></li>
            <li>Create or select your app</li>
            <li>Add the WhatsApp product</li>
            <li>Navigate to API Setup</li>
            <li>Copy the <strong>Phone Number ID</strong> into the field above</li>
            <li>Generate a permanent access token (System User → Generate Token)</li>
            <li>Copy the <strong>WABA ID</strong> from Settings → WhatsApp Business Account</li>
            <li>
              Configure webhook URL:
              <span className="ml-1 inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 font-mono text-[11px]">
                {WEBHOOK_URL}
                <button
                  type="button"
                  onClick={() => copy(WEBHOOK_URL, 'url')}
                  className="text-gray-500 hover:text-gray-800"
                  aria-label="Copy webhook URL"
                >
                  {copied === 'url' ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </span>
            </li>
            <li>Use the verify token shown above</li>
            <li>Subscribe to the <code>messages</code> webhook field</li>
          </ol>
        </div>
      </form>
    </Modal>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Camera, User } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { callFunction } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { WhatsAppNumber } from '@/lib/database.types';

interface Props {
  number: WhatsAppNumber | null;
  onClose: () => void;
}

export function NumberProfileModal({ number, onClose }: Props) {
  const [about, setAbout] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [picFile, setPicFile] = useState<File | null>(null);
  const [picPreview, setPicPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!number) return;
    setAbout('');
    setProfilePicUrl(null);
    setPicFile(null);
    setPicPreview(null);
    setLoading(true);

    callFunction(`update-profile?whatsapp_number_id=${number.id}`, undefined, { method: 'GET' })
      .then((data: any) => {
        setAbout(data.about ?? '');
        setProfilePicUrl(data.profile_picture_url ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [number?.id]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPicFile(file);
    const url = URL.createObjectURL(file);
    setPicPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
  }

  async function onSave() {
    if (!number) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('whatsapp_number_id', number.id);
      fd.append('about', about);
      if (picFile) fd.append('file', picFile);
      await callFunction('update-profile', fd);
      toast.success('Profile updated successfully');
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  const displayPic = picPreview || profilePicUrl;

  return (
    <Modal
      open={!!number}
      onClose={onClose}
      title="Edit WhatsApp Profile"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} loading={saving}>Save changes</Button>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-wa-teal border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">

          {/* Profile picture */}
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-100 ring-2 ring-gray-200">
              {displayPic ? (
                <img src={displayPic} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User size={36} className="text-gray-400" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-wa-teal text-white shadow-md hover:bg-wa-primary transition-colors"
              title="Change profile picture"
            >
              <Camera size={15} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={onPickFile}
              className="hidden"
            />
          </div>

          {/* Number info */}
          <div className="w-full text-center">
            <p className="text-base font-semibold text-gray-900">{number?.display_name}</p>
            <p className="text-sm text-gray-500">{number?.phone_number}</p>
            <p className="mt-1 text-[11px] text-gray-400">
              Display name is managed in Meta Business Manager
            </p>
          </div>

          {/* About */}
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">About</label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value.slice(0, 139))}
              rows={3}
              placeholder="Write something about your business…"
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-wa-teal focus:ring-2 focus:ring-wa-teal/20"
            />
            <p className="mt-1 text-right text-[11px] text-gray-400">{about.length}/139</p>
          </div>

        </div>
      )}
    </Modal>
  );
}

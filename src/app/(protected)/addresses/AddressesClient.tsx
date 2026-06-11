'use client';

import { useState, useTransition } from 'react';
import { saveAddress, deleteAddress, setPrimaryAddress } from '@/actions/users';
import type { Address } from '@/lib/types';

interface Props { initialAddresses: Address[] }

const BLANK: Omit<Address, 'id'> = {
  name: '', phone: '', country: '', state: '', district: '', place: '', primary: false,
};

export default function AddressesClient({ initialAddresses }: Props) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState<Omit<Address, 'id'>>(BLANK);
  const [isPending, startTransition] = useTransition();

  const set = (field: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSave = () => {
    startTransition(async () => {
      const { id } = await saveAddress(form);
      setAddresses((prev) => [...prev, { id, ...form }]);
      setForm(BLANK);
      setShowForm(false);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    });
  };

  const handleSetPrimary = (id: string) => {
    startTransition(async () => {
      await setPrimaryAddress(id);
      setAddresses((prev) => prev.map((a) => ({ ...a, primary: a.id === id })));
    });
  };

  return (
    <div className="page-wrapper">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold dark:text-gray-100">Addresses</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary px-3 py-2 text-sm">
          <i className="fa fa-plus" /> Add
        </button>
      </div>

      {addresses.length === 0 && !showForm && (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <i className="fa fa-location-dot text-4xl" />
          <p className="text-sm">No saved addresses</p>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="card mb-4 p-4">
          <p className="mb-3 font-semibold dark:text-gray-100">New Address</p>
          <div className="flex flex-col gap-3">
            {(['name', 'phone', 'country', 'state', 'district', 'place'] as const).map((f) => (
              <input key={f} className="input" placeholder={f.charAt(0).toUpperCase() + f.slice(1)} value={form[f]} onChange={set(f)} />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleSave} disabled={isPending} className="btn-primary flex-1">Save</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      )}

      {/* Address list */}
      <div className="flex flex-col gap-3">
        {addresses.map((a) => (
          <div key={a.id} className={`card p-4 ${a.primary ? 'border border-primary-400' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold dark:text-gray-100">{a.name}</p>
                <p className="text-sm text-gray-500">{a.phone}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {[a.place, a.district, a.state, a.country].filter(Boolean).join(', ')}
                </p>
                {a.primary && <span className="badge badge-green mt-1">Primary</span>}
              </div>
              <div className="flex gap-2">
                {!a.primary && (
                  <button onClick={() => handleSetPrimary(a.id)} className="text-xs text-primary-600 hover:underline">
                    Set Primary
                  </button>
                )}
                <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-500">
                  <i className="fa fa-trash text-sm" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

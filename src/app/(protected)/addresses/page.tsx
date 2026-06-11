import { getAddresses } from '@/actions/users';
import AddressesClient from './AddressesClient';

export default async function AddressesPage() {
  const addresses = await getAddresses();
  return <AddressesClient initialAddresses={addresses} />;
}

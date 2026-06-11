import { getMyProfile } from '@/actions/users';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const profile = await getMyProfile();
  return <ProfileClient initialProfile={profile} />;
}

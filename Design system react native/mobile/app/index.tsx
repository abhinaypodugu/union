import { Redirect } from 'expo-router';

/** Entry → member tabs. (Add auth / tenant selection gate here.) */
export default function Index() {
  return <Redirect href="/main" />;
}

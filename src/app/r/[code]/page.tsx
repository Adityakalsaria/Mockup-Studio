import ReferralLandingPage from "@/components/referral/ReferralLandingPage";
import { buildReferralMetadata } from "@/lib/referral";

type Props = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  return buildReferralMetadata(code, `/r/${code}`);
}

export default async function ReferralCodePage({ params }: Props) {
  const { code } = await params;
  return <ReferralLandingPage code={code} />;
}

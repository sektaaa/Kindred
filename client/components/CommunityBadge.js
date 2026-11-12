const LABELS = { sober: 'Sober', eco: 'Eco', neurodiverse: 'Neurodiverse' };

export default function CommunityBadge({ community }) {
  if (!community) return null;
  return <span className={`community community-${community}`}>{LABELS[community] || community}</span>;
}

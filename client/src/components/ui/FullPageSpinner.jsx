import './FullPageSpinner.css';

export default function FullPageSpinner() {
  return (
    <div className="fullpage-spinner">
      <div className="fullpage-spinner__ring" />
      <p className="fullpage-spinner__text">Loading...</p>
    </div>
  );
}

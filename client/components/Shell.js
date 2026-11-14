import Header from './Header';
import BottomNav from './BottomNav';

export default function Shell({ children }) {
  return (
    <div className="page">
      <Header />
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}

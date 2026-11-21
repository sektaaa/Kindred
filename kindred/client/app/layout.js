import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Kindred — values-aligned dating',
  description: 'Friendship and dating for sober, eco-conscious and neurodivergent communities.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <AuthProvider>
            <Navbar />
            <main className="container">{children}</main>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

export const metadata = {
  title: 'Support bot',
  description: 'Telegram webhook backend',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

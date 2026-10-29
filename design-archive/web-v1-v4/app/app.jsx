/* ============================================================
   eSlams — App root: theme provider, router, mount
   ============================================================ */
function App(){
  const th = useTheme();
  const { route, parts } = useRoute();

  let page;
  if (route === 'home') page = <Home/>;
  else if (route === 'leaderboard') page = <Leaderboard/>;
  else if (route === 'battlefield') page = <Battlefield/>;
  else if (route === 'arena') page = <Arena/>;
  else if (route === 'grand-slams') page = <GrandSlams/>;
  else if (route === 'u') page = <Profile/>;
  else if (route === 'models') page = parts[2] ? <ModelPage provider={parts[1]} name={parts[2]} /> : parts[1] ? <ProviderPage provider={parts[1]} /> : <Leaderboard/>;
  else if (route === 'games') page = <GamePage slug={parts[1]} />;
  else if (route === 'login') page = <AuthPage mode="login" />;
  else if (route === 'signup') page = <AuthPage mode="signup" />;
  else page = <Home/>;

  const navRoute = ['u','models','games','login','signup'].includes(route) ? '' : route;
  const hideChrome = route === 'login' || route === 'signup';

  return (
    <ThemeCtx.Provider value={th}>
      <Header route={navRoute} />
      <main>{page}</main>
      {!hideChrome && <Footer/>}
    </ThemeCtx.Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);

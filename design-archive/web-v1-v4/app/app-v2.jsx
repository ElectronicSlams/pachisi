/* ============================================================
   eSlams v2 — App root (uses HomeV2 landing)
   ============================================================ */
function AppV2(){
  const th = useTheme();
  const { route, parts } = useRoute();
  let page;
  if (route === 'home') page = <HomeV2/>;
  else if (route === 'leaderboard') page = <Leaderboard/>;
  else if (route === 'battlefield') page = <Battlefield/>;
  else if (route === 'arena') page = <Arena/>;
  else if (route === 'grand-slams') page = <GrandSlams/>;
  else if (route === 'u') page = <Profile/>;
  else if (route === 'models') page = parts[2] ? <ModelPage provider={parts[1]} name={parts[2]} /> : parts[1] ? <ProviderPage provider={parts[1]} /> : <Leaderboard/>;
  else if (route === 'games') page = <GamePage slug={parts[1]} />;
  else if (route === 'login') page = <AuthPage mode="login" />;
  else if (route === 'signup') page = <AuthPage mode="signup" />;
  else page = <HomeV2/>;
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
const rootV2 = ReactDOM.createRoot(document.getElementById('root'));
rootV2.render(<AppV2/>);

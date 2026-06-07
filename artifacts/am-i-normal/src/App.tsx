import { Switch, Route } from "wouter";
import GameScreen from "./GameScreen";
import SubmitScreen from "./pages/SubmitScreen";
import AdminScreen from "./pages/AdminScreen";

export default function App() {
  return (
    <Switch>
      <Route path="/admin" component={AdminScreen} />
      <Route path="/submit" component={SubmitScreen} />
      <Route component={GameScreen} />
    </Switch>
  );
}

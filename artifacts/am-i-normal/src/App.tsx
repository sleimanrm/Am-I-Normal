import { Switch, Route } from "wouter";
import GameScreen from "./GameScreen";
import SubmitScreen from "./pages/SubmitScreen";
import AdminScreen from "./pages/AdminScreen";
import MyHabitsScreen from "./pages/MyHabitsScreen";
import HabitDetailScreen from "./pages/HabitDetailScreen";
import TrendingScreen from "./pages/TrendingScreen";
import CategoriesScreen from "./pages/CategoriesScreen";
import CategoryFeedScreen from "./pages/CategoryFeedScreen";
import LoginScreen from "./pages/LoginScreen";
import SignupScreen from "./pages/SignupScreen";
import ForgotPasswordScreen from "./pages/ForgotPasswordScreen";
import ResetPasswordScreen from "./pages/ResetPasswordScreen";

export default function App() {
  return (
    <Switch>
      <Route path="/admin" component={AdminScreen} />
      <Route path="/login" component={LoginScreen} />
      <Route path="/signup" component={SignupScreen} />
      <Route path="/forgot-password" component={ForgotPasswordScreen} />
      <Route path="/reset-password" component={ResetPasswordScreen} />
      <Route path="/submit" component={SubmitScreen} />
      <Route path="/my-habits/:id" component={HabitDetailScreen} />
      <Route path="/my-habits" component={MyHabitsScreen} />
      <Route path="/trending" component={TrendingScreen} />
      <Route path="/categories/:category" component={CategoryFeedScreen} />
      <Route path="/categories" component={CategoriesScreen} />
      <Route component={GameScreen} />
    </Switch>
  );
}

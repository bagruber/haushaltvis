import { Navigate } from "react-router-dom";

// The income→hub→expense flow was replaced by the kameral exploratory tree
// (see Erkunden). Kept as a redirect so old links keep working.
export function Geldfluss() {
  return <Navigate to="/erkunden" replace />;
}

// Define application routes
export default [
  {
    path: "/",
    component: () => import("./pages/Home.jsx")
  },
  {
    path: "/chat",
    component: () => import("./pages/Chat.jsx")
  }
]; 
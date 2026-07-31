/**
 * Public surface of the navigation feature. Other folders import from here
 * rather than reaching into individual files, so internals can move freely.
 */
export { type Route, UPLOAD_ROUTE, sameRoute } from './routes'
export { type NavStack, INITIAL_NAV_STACK, currentRoute, canGoBack, pushRoute, goToDepth } from './navStack'
export { routeTitle, type RouteTitleContext, type SessionTitleParts } from './routeTitle'
export { useNavigation, type Navigation } from './useNavigation'
export { NavBar } from './NavBar'
export { RouteUnavailable } from './RouteUnavailable'

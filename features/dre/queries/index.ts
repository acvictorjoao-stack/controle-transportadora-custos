export {
  fetchOperationalDreExpenses,
  fetchOperationalDreRouteLabels,
  fetchOperationalDreTripDetails,
  fetchOperationalDreTrips,
  fetchOperationalDreTripsForVehicles,
  fetchOperationalDreUnlinkedVehicleExpenses,
  fetchOperationalDreDriverLabels,
  fetchOperationalDreVehicleLabels,
} from './operational-dre-data';
export type {FetchOperationalDreExpensesOptions, FetchOperationalDreTripsOptions} from './operational-dre-data';

export {
  expenseMatchesDimensionalScope,
  hasOperationalDreDimensionalFilters,
  resolveOperationalDreExpenseDimensionFilter,
} from '../services/operational-dre-expense-scope';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export type AuthStackParamList = {
  Splash: undefined;
  Landing: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

export type BusinessStackParamList = {
  BusinessSelection: undefined;
  JoinBusiness: undefined;
  CreateBusiness: undefined;
  BusinessCreated: { joinCode: string };
};

export type EmployeeTabParamList = {
  Inventory: undefined;
  Sales: undefined;
  Settings: undefined;
};

export type OwnerTabParamList = {
  Inventory: undefined;
  Sales: undefined;
  Employees: undefined;
  Settings: undefined;
};

export type SharedStackParamList = {
  AddProduct: undefined;
  EditProduct: { productId: string };
  Checkout: undefined;
  Receipt: { saleId: string };
  Analytics: undefined;
  PerformanceDashboard: undefined;
  TransactionDetail: { saleId: string };
  EmployeeDetail: { employeeId: string };
  BranchManagement: undefined;
  AuditLog: undefined;
  Reports: undefined;
  Restock: { productId: string };
};

export type RootStackParamList = AuthStackParamList &
  BusinessStackParamList &
  SharedStackParamList & {
    EmployeeApp: undefined;
    OwnerApp: undefined;
  };

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type EmployeeTabNavigationProp = BottomTabNavigationProp<EmployeeTabParamList>;
export type OwnerTabNavigationProp = BottomTabNavigationProp<OwnerTabParamList>;

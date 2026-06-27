import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { ThemeColors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { glyphs } from '@/constants/glyphs';
import { useTheme, useThemedStyles } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type {
  EmployeeTabParamList,
  OwnerTabParamList,
  RootStackParamList,
} from '@/types/navigation';

import AuditLogScreen from '@/features/settings/AuditLogScreen';
import AddProductScreen from '@/features/inventory/AddProductScreen';
import AnalyticsScreen from '@/features/sales/AnalyticsScreen';
import AuthForgotPasswordScreen from '@/features/auth/ForgotPasswordScreen';
import AuthLandingScreen from '@/features/auth/LandingScreen';
import AuthLoginScreen from '@/features/auth/LoginScreen';
import AuthSignupScreen from '@/features/auth/SignupScreen';
import BusinessCreatedScreen from '@/features/business/BusinessCreatedScreen';
import BusinessSelectionScreen from '@/features/business/BusinessSelectionScreen';
import BranchManagementScreen from '@/features/settings/BranchManagementScreen';
import CheckoutScreen from '@/features/cart/CheckoutScreen';
import CreateBusinessScreen from '@/features/business/CreateBusinessScreen';
import EditProductScreen from '@/features/inventory/EditProductScreen';
import EmployeeDetailScreen from '@/features/employees/EmployeeDetailScreen';
import EmployeeListScreen from '@/features/employees/EmployeeListScreen';
import EmployeePerformanceScreen from '@/features/employees/PerformanceDashboard';
import InventoryScreen from '@/features/inventory/InventoryScreen';
import LandingSplashScreen from '@/features/auth/SplashScreen';
import ReceiptScreen from '@/features/cart/ReceiptScreen';
import ReportsScreen from '@/features/settings/ReportsScreen';
import OwnerSettingsScreen from '@/features/settings/OwnerSettingsScreen';
import SalesOverviewScreen from '@/features/sales/SalesOverviewScreen';
import SalesScreen from '@/features/sales/SalesScreen';
import SettingsScreen from '@/features/settings/SettingsScreen';
import SyncDiagnosticsScreen from '@/features/settings/SyncDiagnosticsScreen';
import TransactionDetailScreen from '@/features/sales/TransactionDetailScreen';
import JoinBusinessScreen from '@/features/business/JoinBusinessScreen';
import RestockModal from '@/features/inventory/RestockModal';

const Stack = createNativeStackNavigator<RootStackParamList>();
const EmployeeTabs = createBottomTabNavigator<EmployeeTabParamList>();
const OwnerTabs = createBottomTabNavigator<OwnerTabParamList>();

function TabIcon({ active, glyph }: { active: boolean; glyph: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.tabIcon}>
      {active ? <View style={styles.tabDot} /> : null}
      <Text style={[styles.tabGlyph, active && styles.tabGlyphActive]}>{glyph}</Text>
    </View>
  );
}

const buildTabBarOptions = (colors: ThemeColors) => ({
  headerShown: false,
  tabBarActiveTintColor: colors.accent,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarHideOnKeyboard: true,
  tabBarLabelStyle: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: dimensions.cardBorderWidth,
    height: dimensions.tabBarHeight,
    paddingBottom: 4,
    paddingTop: 4,
    shadowOpacity: 0,
    elevation: 0,
  },
  tabBarItemStyle: {
    minHeight: dimensions.tabBarHeight,
  },
  tabBarShowLabel: true,
});

function EmployeeTabNavigator() {
  const tabBarOptions = buildTabBarOptions(useTheme());
  return (
    <EmployeeTabs.Navigator
      screenOptions={({ route }) => ({
        ...tabBarOptions,
        tabBarIcon: ({ focused }) => {
          const glyph = route.name === 'Inventory' ? glyphs.inventory : route.name === 'Sales' ? glyphs.sales : glyphs.settings;
          return <TabIcon active={focused} glyph={glyph} />;
        },
      })}
    >
      <EmployeeTabs.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventory' }} />
      <EmployeeTabs.Screen name="Sales" component={SalesScreen} options={{ title: 'Sales' }} />
      <EmployeeTabs.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </EmployeeTabs.Navigator>
  );
}

function OwnerTabNavigator() {
  const tabBarOptions = buildTabBarOptions(useTheme());
  return (
    <OwnerTabs.Navigator
      screenOptions={({ route }) => ({
        ...tabBarOptions,
        tabBarIcon: ({ focused }) => {
          const glyph =
            route.name === 'Inventory'
              ? glyphs.inventory
              : route.name === 'Sales'
                ? glyphs.sales
                : route.name === 'Employees'
                  ? glyphs.employees
                  : glyphs.settings;
          return <TabIcon active={focused} glyph={glyph} />;
        },
      })}
    >
      <OwnerTabs.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventory' }} />
      <OwnerTabs.Screen name="Sales" component={SalesOverviewScreen} options={{ title: 'Sales' }} />
      <OwnerTabs.Screen name="Employees" component={EmployeeListScreen} options={{ title: 'Employees' }} />
      <OwnerTabs.Screen name="Settings" component={OwnerSettingsScreen} options={{ title: 'Settings' }} />
    </OwnerTabs.Navigator>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  tabIcon: {
    width: 48,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 0,
  },
  tabGlyph: {
    color: colors.textMuted,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '600',
  },
  tabGlyphActive: {
    color: colors.accent,
  },
  tabDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.accent,
  },
});

export function RootNavigator() {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.role);
  const activeBusiness = useBusinessStore((state) => state.activeBusiness);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {status === 'loading' ? (
        <Stack.Screen name="Splash" component={LandingSplashScreen} />
      ) : status === 'signed_out' ? (
        <>
          <Stack.Screen name="Landing" component={AuthLandingScreen} />
          <Stack.Screen name="Login" component={AuthLoginScreen} />
          <Stack.Screen name="Signup" component={AuthSignupScreen} />
          <Stack.Screen name="ForgotPassword" component={AuthForgotPasswordScreen} />
        </>
      ) : activeBusiness === null ? (
        <>
          <Stack.Screen name="BusinessSelection" component={BusinessSelectionScreen} />
          <Stack.Screen name="JoinBusiness" component={JoinBusinessScreen} />
          <Stack.Screen name="CreateBusiness" component={CreateBusinessScreen} />
          <Stack.Screen name="BusinessCreated" component={BusinessCreatedScreen} />
        </>
      ) : (
        role === 'owner' ? (
          <Stack.Screen
            name="OwnerApp"
            component={OwnerTabNavigator}
            options={{ title: 'Owner workspace' }}
          />
        ) : (
          <Stack.Screen
            name="EmployeeApp"
            component={EmployeeTabNavigator}
            options={{ title: 'Employee workspace' }}
          />
        )
      )}

      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="EditProduct" component={EditProductScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="PerformanceDashboard" component={EmployeePerformanceScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} />
      <Stack.Screen name="BranchManagement" component={BranchManagementScreen} />
      <Stack.Screen name="AuditLog" component={AuditLogScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="SyncDiagnostics" component={SyncDiagnosticsScreen} />
      <Stack.Screen name="Restock" component={RestockModal} />
    </Stack.Navigator>
  );
}

interface PayPalButtons {
  render: (container: HTMLElement | null) => void;
}

interface PayPalActions {
  subscription: {
    create: (options: { plan_id: string }) => Promise<string>;
  };
}

interface Window {
  paypal?: {
    Buttons: (options: {
      style?: {
        shape?: string;
        color?: string;
        layout?: string;
      };
      createSubscription?: (data: any, actions: PayPalActions) => Promise<string>;
      onApprove?: (data: any, actions: any) => void;
      onCancel?: () => void;
      onError?: (err: any) => void;
    }) => PayPalButtons;
  };
}

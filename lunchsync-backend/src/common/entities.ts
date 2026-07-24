import { Provider } from '../modules/providers/entities/provider.entity';
import { ProviderAccount } from '../modules/provider-accounts/entities/provider-account.entity';
import { ProviderBot } from '../modules/provider-bots/entities/provider-bot.entity';
import { DeliveryZone } from '../modules/delivery-zones/entities/delivery-zone.entity';
import { User } from '../modules/users/entities/user.entity';
import { AuthToken } from '../modules/auth/tokens/entities/auth-token.entity';
import { UserVerification } from '../modules/auth/verifications/entities/user-verification.entity';
import { DailyMenu } from '../modules/menus/daily-menus/entities/daily-menu.entity';
import { MenuService } from '../modules/menus/menu-services/entities/menu-service.entity';
import { ComboGroup } from '../modules/menus/combo-groups/entities/combo-group.entity';
import { ComboOption } from '../modules/menus/combo-options/entities/combo-option.entity';
import { Order } from '../modules/orders/entities/order.entity';
import { OrderItem } from '../modules/orders/items/entities/order-item.entity';
import { OrderItemSelection } from '../modules/orders/selections/entities/order-item-selection.entity';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';
import { WhatsappLog } from '../modules/whatsapp/entities/whatsapp-log.entity';

export const entities = [
  Provider,
  ProviderAccount,
  ProviderBot,
  DeliveryZone,
  User,
  AuthToken,
  UserVerification,
  DailyMenu,
  MenuService,
  ComboGroup,
  ComboOption,
  Order,
  OrderItem,
  OrderItemSelection,
  AuditLog,
  WhatsappLog,
];

import { useShop } from '@/components/ShopContext'
import { format } from 'date-fns'

export default function SubscriptionStatus() {
  const { shop } = useShop()

  if (!shop) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'trial':
        return 'bg-blue-100 text-blue-800'
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'trial':
        return 'Trial'
      case 'active':
        return 'Active'
      case 'expired':
        return 'Expired'
      default:
        return status
    }
  }

  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy')
  }

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Subscription Status</h3>
          <p className="mt-1 text-sm text-gray-500">
            {shop.subscription_status === 'trial' ? (
              <>
                Trial ends on {formatDate(shop.subscription_end_date)}
              </>
            ) : (
              <>
                Subscription {shop.subscription_status === 'active' ? 'valid until' : 'expired on'}{' '}
                {formatDate(shop.subscription_end_date)}
              </>
            )}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
            shop.subscription_status
          )}`}
        >
          {getStatusText(shop.subscription_status)}
        </span>
      </div>
      {shop.subscription_status === 'trial' && (
        <div className="mt-4">
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block text-blue-600">
                  Trial Progress
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-blue-600">
                  {Math.round(
                    ((new Date().getTime() - new Date(shop.trial_start_date).getTime()) /
                      (new Date(shop.subscription_end_date).getTime() -
                        new Date(shop.trial_start_date).getTime())) *
                      100
                  )}
                  %
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
              <div
                style={{
                  width: `${Math.round(
                    ((new Date().getTime() - new Date(shop.trial_start_date).getTime()) /
                      (new Date(shop.subscription_end_date).getTime() -
                        new Date(shop.trial_start_date).getTime())) *
                      100
                  )}%`,
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
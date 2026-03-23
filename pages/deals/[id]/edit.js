import { getSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import Layout from '../../../components/Layout'
import DealForm from '../../../components/DealForm'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

export default function EditDealPage() {
  const router = useRouter()
  const { id } = router.query
  const [deal, setDeal] = useState(null)

  useEffect(() => {
    if (id) {
      axios.get(`/api/deals/${id}`).then(r => setDeal(r.data.deal))
    }
  }, [id])

  if (!deal) return <Layout><div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading...</div></div></Layout>

  // Prepare initial data: use IDs not objects for supplier/buyer
  const initialData = {
    ...deal,
    supplier: deal.supplier?._id || deal.supplier,
    buyer: deal.buyer?._id || deal.buyer,
  }

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="page-title">Edit Deal</h1>
          <p className="text-gray-500 text-sm mt-1 font-mono">{deal.dealId}</p>
        </div>
        <DealForm initialData={initialData} mode="edit" />
      </div>
    </Layout>
  )
}

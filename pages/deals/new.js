import { getSession } from 'next-auth/react'
import Layout from '../../components/Layout'
import DealForm from '../../components/DealForm'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

export default function NewDealPage() {
  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="page-title">New Deal</h1>
          <p className="text-gray-500 text-sm mt-1">Create a new DA trade deal</p>
        </div>
        <DealForm mode="create" />
      </div>
    </Layout>
  )
}

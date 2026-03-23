import { getSession } from 'next-auth/react'
import Layout from '../../components/Layout'
import PartyForm from '../../components/PartyForm'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

export default function NewPartyPage() {
  return (
    <Layout>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="page-title">Add Party</h1>
          <p className="text-gray-500 text-sm mt-1">Create a new buyer or supplier profile</p>
        </div>
        <PartyForm mode="create" />
      </div>
    </Layout>
  )
}

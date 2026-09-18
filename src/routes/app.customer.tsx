import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/customer')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/customer"!</div>
}

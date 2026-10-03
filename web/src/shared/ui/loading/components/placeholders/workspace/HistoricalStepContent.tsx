import { SkeletonLine } from '../../SkeletonLine';

export function HistoricalStepContent() {
  return (
    <div>
      <div className="flex h-9 items-center">
        <SkeletonLine className="w-40" />
      </div>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-3/5" />
          <col />
          <col />
        </colgroup>
        <tbody>
          {Array.from({ length: 6 }, (_, index) => (
            <tr key={index}>
              <td className="h-9.5 border-b border-line py-2">
                <SkeletonLine />
              </td>
              <td className="h-9.5 border-b border-line py-2">
                <SkeletonLine className="w-16" />
              </td>
              <td className="h-9.5 border-b border-line py-2">
                <SkeletonLine className="ml-auto w-12" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

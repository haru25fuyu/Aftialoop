import '../css/ContentsList.css';
import { Content } from '../types/Content';

type Props = {
  contents: Content[];
  Component: React.ComponentType<{ item: Content }>;
};

export const ContentsList: React.FC<Props> = ({ contents, Component }) => {
  return (
    <div className="contents-list">
      {contents.map((item) => (
        <Component key={item.id} item={item} />
      ))}
    </div>
  )
};

export default ContentsList;
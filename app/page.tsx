import PortalLayout from "@/components/portal/PortalLayout";
import FeatureCards from "@/components/portal/FeatureCards";
import SearchBar from "@/components/portal/SearchBar";
import NewsForumSection from "@/components/portal/NewsForumSection";
import StudentQuizPanel from "@/components/portal/StudentQuizPanel";

export default function HomePage() {
  return (
    <PortalLayout>
      <StudentQuizPanel />
      <FeatureCards />
      <div className="border-t border-gray-200 bg-gray-50">
        <SearchBar />
      </div>
      <NewsForumSection />
    </PortalLayout>
  );
}

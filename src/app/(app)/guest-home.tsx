"use client";

import { BookOpen, Play, Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { loginHref } from "@/lib/auth-redirect";
import { Metric } from "./dashboard-view";

/**
 * Home for visitors who haven't signed in: the dashboard's shape with no
 * data (no numbers are made up). Every action leads to the start page and
 * returns to where the visitor was headed after signing in.
 */
export function GuestHome() {
  return (
    <>
      <PageHeader
        title="studay를 시작해 볼까요?"
        description="과목별 할 일, 공부 시간, 일정을 한곳에서 관리해요."
        actions={
          <>
            <Link href={loginHref("/focus")} className={buttonClasses("secondary")}>
              <Play aria-hidden className="size-4" />
              공부 시작
            </Link>
            <Link href={loginHref("/todos")} className={buttonClasses("primary")}>
              <Plus aria-hidden className="size-4" />할 일 추가
            </Link>
          </>
        }
      />

      <section
        aria-label="오늘 요약"
        className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
      >
        <Metric label="오늘 할 일" value="—" hint="로그인하면 보여요" />
        <Metric label="오늘 공부한 시간" value="—" hint="로그인하면 기록돼요" />
        <Metric label="이번 주 공부 시간" value="—" hint="로그인하면 기록돼요" />
        <Metric label="기한 지난 할 일" value="—" hint="로그인하면 보여요" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Card>
          <CardHeader title="오늘의 할 일" />
          <EmptyState
            icon={BookOpen}
            title="과목을 등록하고 할 일을 추가해 보세요."
            description="Google 계정으로 별도의 회원가입 없이 바로 시작할 수 있어요."
            action={
              <Link href={loginHref("/subjects")} className={buttonClasses("primary")}>
                과목 추가
              </Link>
            }
          />
        </Card>
        <Card className="self-start">
          <CardHeader title="과목별 현황" description="할 일 완료율과 이번 주 공부 시간" />
          <EmptyState title="과목을 추가하면 진행률이 표시돼요." />
        </Card>
      </div>
    </>
  );
}
